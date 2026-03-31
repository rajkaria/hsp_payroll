// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title HSPAdapter — HashKey Settlement Protocol Adapter
 * @notice Message layer for payment request lifecycle: create → confirm → receipt
 * @dev Does NOT manage funds. Only orchestrates payment status and generates receipts.
 */
contract HSPAdapter {
    enum RequestStatus { Pending, Confirmed, Settled, Cancelled }

    struct PaymentRequest {
        bytes32 requestId;
        address payer;
        address recipient;
        address token;
        uint256 amount;
        RequestStatus status;
        uint256 createdAt;
        uint256 settledAt;
    }

    mapping(bytes32 => PaymentRequest) public requests;
    uint256 public requestCount;

    event PaymentRequestCreated(
        bytes32 indexed requestId,
        address indexed payer,
        address indexed recipient,
        address token,
        uint256 amount
    );
    event PaymentConfirmed(bytes32 indexed requestId);
    event PaymentSettled(bytes32 indexed requestId, uint256 timestamp);
    event PaymentCancelled(bytes32 indexed requestId);

    function createPaymentRequest(
        address payer,
        address recipient,
        address token,
        uint256 amount
    ) external returns (bytes32 requestId) {
        requestCount++;
        requestId = keccak256(
            abi.encodePacked(payer, recipient, token, amount, block.timestamp, requestCount)
        );

        requests[requestId] = PaymentRequest({
            requestId: requestId,
            payer: payer,
            recipient: recipient,
            token: token,
            amount: amount,
            status: RequestStatus.Pending,
            createdAt: block.timestamp,
            settledAt: 0
        });

        emit PaymentRequestCreated(requestId, payer, recipient, token, amount);
    }

    function confirmPayment(bytes32 requestId) external {
        PaymentRequest storage req = requests[requestId];
        require(req.createdAt != 0, "Request does not exist");
        require(req.status == RequestStatus.Pending, "Not pending");

        req.status = RequestStatus.Confirmed;
        emit PaymentConfirmed(requestId);
    }

    function markSettled(bytes32 requestId) external {
        PaymentRequest storage req = requests[requestId];
        require(req.createdAt != 0, "Request does not exist");
        require(
            req.status == RequestStatus.Confirmed || req.status == RequestStatus.Pending,
            "Cannot settle"
        );

        req.status = RequestStatus.Settled;
        req.settledAt = block.timestamp;
        emit PaymentSettled(requestId, block.timestamp);
    }

    function cancelPayment(bytes32 requestId) external {
        PaymentRequest storage req = requests[requestId];
        require(req.createdAt != 0, "Request does not exist");
        require(req.status == RequestStatus.Pending, "Can only cancel pending");

        req.status = RequestStatus.Cancelled;
        emit PaymentCancelled(requestId);
    }

    function getRequest(bytes32 requestId) external view returns (PaymentRequest memory) {
        require(requests[requestId].createdAt != 0, "Request does not exist");
        return requests[requestId];
    }

    function createBatchRequests(
        address payer,
        address[] calldata recipients,
        address token,
        uint256[] calldata amounts
    ) external returns (bytes32[] memory requestIds) {
        require(recipients.length == amounts.length, "Length mismatch");
        requestIds = new bytes32[](recipients.length);

        for (uint256 i = 0; i < recipients.length; i++) {
            requestCount++;
            bytes32 requestId = keccak256(
                abi.encodePacked(payer, recipients[i], token, amounts[i], block.timestamp, requestCount)
            );

            requests[requestId] = PaymentRequest({
                requestId: requestId,
                payer: payer,
                recipient: recipients[i],
                token: token,
                amount: amounts[i],
                status: RequestStatus.Pending,
                createdAt: block.timestamp,
                settledAt: 0
            });

            emit PaymentRequestCreated(requestId, payer, recipients[i], token, amounts[i]);
            requestIds[i] = requestId;
        }
    }
}
