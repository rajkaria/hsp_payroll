// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IEAS, AttestationRequest, AttestationRequestData } from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import { ISchemaRegistry } from "@ethereum-attestation-service/eas-contracts/contracts/ISchemaRegistry.sol";
import { ISchemaResolver } from "@ethereum-attestation-service/eas-contracts/contracts/resolver/ISchemaResolver.sol";
import { NO_EXPIRATION_TIME, EMPTY_UID } from "@ethereum-attestation-service/eas-contracts/contracts/Common.sol";

interface IPayrollFactory {
    struct Receipt {
        uint256 payrollId;
        uint256 cycleNumber;
        address recipient;
        uint256 amount;
        uint256 timestamp;
        bytes32 hspRequestId;
    }

    function getReceipts(uint256 payrollId, uint256 cycleNumber) external view returns (Receipt[] memory);
}

interface IReputationRegistry {
    function recordAttestation(
        address employer,
        address recipient,
        uint256 amount,
        uint256 expectedInterval,
        uint256 actualElapsed,
        bytes32 uid
    ) external;
}

contract PayrollAttestor {
    IEAS public immutable eas;
    ISchemaRegistry public immutable schemaRegistry;
    IPayrollFactory public immutable factory;

    bytes32 public schemaUID;
    address public owner;
    IReputationRegistry public reputation;
    mapping(address => mapping(address => uint256)) public lastAttestationTs;

    string public constant SCHEMA = "bytes32 payrollId, uint256 cycleNumber, address employer, address recipient, uint256 amount, address token, bytes32 hspRequestId, string tokenSymbol";

    event SchemaRegistered(bytes32 indexed uid);
    event PayrollAttested(bytes32 indexed attestationUID, uint256 indexed payrollId, uint256 cycleNumber, address indexed recipient, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _eas, address _schemaRegistry, address _factory) {
        eas = IEAS(_eas);
        schemaRegistry = ISchemaRegistry(_schemaRegistry);
        factory = IPayrollFactory(_factory);
        owner = msg.sender;
    }

    function setReputationRegistry(address _r) external onlyOwner {
        reputation = IReputationRegistry(_r);
    }

    /// @notice Set schemaUID directly when the schema is already registered on chain.
    function setSchemaUID(bytes32 uid) external onlyOwner {
        require(schemaUID == bytes32(0), "Already set");
        schemaUID = uid;
        emit SchemaRegistered(uid);
    }

    function _pushReputation(
        address employer,
        address recipient,
        uint256 amount,
        uint256 expectedInterval,
        bytes32 uid
    ) internal {
        if (address(reputation) == address(0)) return;
        uint256 last = lastAttestationTs[recipient][employer];
        uint256 elapsed = last == 0 ? 0 : block.timestamp - last;
        lastAttestationTs[recipient][employer] = block.timestamp;
        reputation.recordAttestation(employer, recipient, amount, expectedInterval, elapsed, uid);
    }

    /// @notice Register the payroll attestation schema. Call once after deploy.
    function registerSchema() external onlyOwner returns (bytes32) {
        require(schemaUID == bytes32(0), "Schema already registered");

        schemaUID = schemaRegistry.register(
            SCHEMA,
            ISchemaResolver(address(0)), // no resolver
            false // non-revocable
        );

        emit SchemaRegistered(schemaUID);
        return schemaUID;
    }

    /// @notice Attest all payments in a payroll cycle
    function attestCycle(
        uint256 payrollId,
        uint256 cycleNumber,
        address employer,
        address token,
        string calldata tokenSymbol
    ) external returns (bytes32[] memory) {
        require(schemaUID != bytes32(0), "Schema not registered");

        IPayrollFactory.Receipt[] memory receipts = factory.getReceipts(payrollId, cycleNumber);
        require(receipts.length > 0, "No receipts for cycle");

        bytes32[] memory uids = new bytes32[](receipts.length);

        for (uint256 i = 0; i < receipts.length; i++) {
            bytes memory encodedData = abi.encode(
                bytes32(payrollId),
                receipts[i].cycleNumber,
                employer,
                receipts[i].recipient,
                receipts[i].amount,
                token,
                receipts[i].hspRequestId,
                tokenSymbol
            );

            uids[i] = eas.attest(
                AttestationRequest({
                    schema: schemaUID,
                    data: AttestationRequestData({
                        recipient: receipts[i].recipient,
                        expirationTime: NO_EXPIRATION_TIME,
                        revocable: false,
                        refUID: EMPTY_UID,
                        data: encodedData,
                        value: 0
                    })
                })
            );

            _pushReputation(employer, receipts[i].recipient, receipts[i].amount, 0, uids[i]);

            emit PayrollAttested(
                uids[i],
                payrollId,
                cycleNumber,
                receipts[i].recipient,
                receipts[i].amount
            );
        }

        return uids;
    }

    /// @notice Attest a single payment (for granular control)
    function attestSingle(
        uint256 payrollId,
        uint256 cycleNumber,
        address employer,
        address recipient,
        uint256 amount,
        address token,
        bytes32 hspRequestId,
        string calldata tokenSymbol
    ) external returns (bytes32) {
        require(schemaUID != bytes32(0), "Schema not registered");

        bytes memory encodedData = abi.encode(
            bytes32(payrollId),
            cycleNumber,
            employer,
            recipient,
            amount,
            token,
            hspRequestId,
            tokenSymbol
        );

        bytes32 uid = eas.attest(
            AttestationRequest({
                schema: schemaUID,
                data: AttestationRequestData({
                    recipient: recipient,
                    expirationTime: NO_EXPIRATION_TIME,
                    revocable: false,
                    refUID: EMPTY_UID,
                    data: encodedData,
                    value: 0
                })
            })
        );

        _pushReputation(employer, recipient, amount, 0, uid);
        emit PayrollAttested(uid, payrollId, cycleNumber, recipient, amount);
        return uid;
    }
}
