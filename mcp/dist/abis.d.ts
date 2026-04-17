export declare const PAYROLL_FACTORY_ABI: readonly [{
    readonly inputs: readonly [{
        readonly name: "name";
        readonly type: "string";
    }, {
        readonly name: "token";
        readonly type: "address";
    }, {
        readonly name: "recipients";
        readonly type: "address[]";
    }, {
        readonly name: "amounts";
        readonly type: "uint256[]";
    }, {
        readonly name: "frequency";
        readonly type: "uint256";
    }];
    readonly name: "createPayroll";
    readonly outputs: readonly [{
        readonly name: "payrollId";
        readonly type: "uint256";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "payrollId";
        readonly type: "uint256";
    }, {
        readonly name: "amount";
        readonly type: "uint256";
    }];
    readonly name: "fundPayroll";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "payrollId";
        readonly type: "uint256";
    }];
    readonly name: "executeCycle";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "payrollId";
        readonly type: "uint256";
    }];
    readonly name: "cancelPayroll";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "payrollId";
        readonly type: "uint256";
    }, {
        readonly name: "recipient";
        readonly type: "address";
    }, {
        readonly name: "amount";
        readonly type: "uint256";
    }];
    readonly name: "addRecipient";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "payrollId";
        readonly type: "uint256";
    }, {
        readonly name: "recipientIndex";
        readonly type: "uint256";
    }];
    readonly name: "removeRecipient";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "payrollId";
        readonly type: "uint256";
    }];
    readonly name: "getPayrollDetails";
    readonly outputs: readonly [{
        readonly name: "owner";
        readonly type: "address";
    }, {
        readonly name: "token";
        readonly type: "address";
    }, {
        readonly name: "name";
        readonly type: "string";
    }, {
        readonly name: "recipients";
        readonly type: "address[]";
    }, {
        readonly name: "amounts";
        readonly type: "uint256[]";
    }, {
        readonly name: "frequency";
        readonly type: "uint256";
    }, {
        readonly name: "startTime";
        readonly type: "uint256";
    }, {
        readonly name: "lastExecuted";
        readonly type: "uint256";
    }, {
        readonly name: "cycleCount";
        readonly type: "uint256";
    }, {
        readonly name: "totalDeposited";
        readonly type: "uint256";
    }, {
        readonly name: "totalPaid";
        readonly type: "uint256";
    }, {
        readonly name: "active";
        readonly type: "bool";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "payrollId";
        readonly type: "uint256";
    }];
    readonly name: "getRunway";
    readonly outputs: readonly [{
        readonly name: "cyclesRemaining";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "payrollCount";
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly name: "escrowBalances";
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "recipient";
        readonly type: "address";
    }];
    readonly name: "getRecipientPayrolls";
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint256[]";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: true;
        readonly name: "payrollId";
        readonly type: "uint256";
    }, {
        readonly indexed: true;
        readonly name: "owner";
        readonly type: "address";
    }, {
        readonly indexed: false;
        readonly name: "token";
        readonly type: "address";
    }, {
        readonly indexed: false;
        readonly name: "name";
        readonly type: "string";
    }];
    readonly name: "PayrollCreated";
    readonly type: "event";
}];
export declare const ERC20_ABI: readonly [{
    readonly inputs: readonly [{
        readonly name: "to";
        readonly type: "address";
    }, {
        readonly name: "amount";
        readonly type: "uint256";
    }];
    readonly name: "mint";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "spender";
        readonly type: "address";
    }, {
        readonly name: "amount";
        readonly type: "uint256";
    }];
    readonly name: "approve";
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "bool";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
    }];
    readonly name: "balanceOf";
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "owner";
        readonly type: "address";
    }, {
        readonly name: "spender";
        readonly type: "address";
    }];
    readonly name: "allowance";
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "decimals";
    readonly outputs: readonly [{
        readonly type: "uint8";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "symbol";
    readonly outputs: readonly [{
        readonly type: "string";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}];
export declare const REPUTATION_REGISTRY_ABI: readonly [{
    readonly inputs: readonly [{
        readonly name: "recipient";
        readonly type: "address";
    }];
    readonly name: "incomeOf";
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "recipient";
        readonly type: "address";
    }];
    readonly name: "employersOf";
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "recipient";
        readonly type: "address";
    }];
    readonly name: "onTimeRate";
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "recipient";
        readonly type: "address";
    }];
    readonly name: "attestationsOf";
    readonly outputs: readonly [{
        readonly type: "bytes32[]";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "recipient";
        readonly type: "address";
    }];
    readonly name: "highestMilestone";
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "recipient";
        readonly type: "address";
    }, {
        readonly name: "minAmount";
        readonly type: "uint256";
    }, {
        readonly name: "windowSeconds";
        readonly type: "uint256";
    }];
    readonly name: "verifyMinimumIncome";
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}];
export declare const ADAPTIVE_CADENCE_ABI: readonly [{
    readonly inputs: readonly [{
        readonly name: "payrollId";
        readonly type: "uint256";
    }, {
        readonly name: "recipient";
        readonly type: "address";
    }, {
        readonly name: "mode";
        readonly type: "uint8";
    }, {
        readonly name: "canSwitch";
        readonly type: "bool";
    }, {
        readonly name: "hybridStreamBps";
        readonly type: "uint256";
    }];
    readonly name: "setCadencePolicy";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "payrollId";
        readonly type: "uint256";
    }, {
        readonly name: "mode";
        readonly type: "uint8";
    }];
    readonly name: "setRecipientCadence";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "payrollId";
        readonly type: "uint256";
    }];
    readonly name: "claim";
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "payrollId";
        readonly type: "uint256";
    }, {
        readonly name: "recipient";
        readonly type: "address";
    }];
    readonly name: "accruedFor";
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}];
export declare const YIELD_ESCROW_ABI: readonly [{
    readonly inputs: readonly [{
        readonly name: "payrollId";
        readonly type: "uint256";
    }, {
        readonly name: "vault";
        readonly type: "address";
    }, {
        readonly name: "autoCompound";
        readonly type: "bool";
    }];
    readonly name: "enableYield";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "payrollId";
        readonly type: "uint256";
    }];
    readonly name: "disableYield";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "payrollId";
        readonly type: "uint256";
    }];
    readonly name: "claimYield";
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "payrollId";
        readonly type: "uint256";
    }];
    readonly name: "availableBalance";
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "payrollId";
        readonly type: "uint256";
    }];
    readonly name: "accruedYield";
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}];
export declare const PAYROLL_ADVANCE_ABI: readonly [{
    readonly inputs: readonly [{
        readonly name: "recipient";
        readonly type: "address";
    }, {
        readonly name: "payrollId";
        readonly type: "uint256";
    }];
    readonly name: "maxAdvanceFor";
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "recipient";
        readonly type: "address";
    }];
    readonly name: "tierFor";
    readonly outputs: readonly [{
        readonly name: "ltvBps";
        readonly type: "uint256";
    }, {
        readonly name: "interestBps";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "recipient";
        readonly type: "address";
    }];
    readonly name: "outstandingDebt";
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "payrollId";
        readonly type: "uint256";
    }, {
        readonly name: "amount";
        readonly type: "uint256";
    }];
    readonly name: "requestAdvance";
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "token";
        readonly type: "address";
    }, {
        readonly name: "amount";
        readonly type: "uint256";
    }];
    readonly name: "fundLenderPool";
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "token";
        readonly type: "address";
    }, {
        readonly name: "shares";
        readonly type: "uint256";
    }];
    readonly name: "withdrawFromPool";
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "token";
        readonly type: "address";
    }];
    readonly name: "lenderPoolBalance";
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}];
export declare const COMPLIANCE_REGISTRY_ABI: readonly [{
    readonly inputs: readonly [{
        readonly name: "payrollId";
        readonly type: "uint256";
    }, {
        readonly name: "hook";
        readonly type: "address";
    }];
    readonly name: "attachHook";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "payrollId";
        readonly type: "uint256";
    }, {
        readonly name: "hook";
        readonly type: "address";
    }];
    readonly name: "detachHook";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "payrollId";
        readonly type: "uint256";
    }];
    readonly name: "getHooks";
    readonly outputs: readonly [{
        readonly type: "address[]";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "payrollId";
        readonly type: "uint256";
    }, {
        readonly name: "recipient";
        readonly type: "address";
    }, {
        readonly name: "amount";
        readonly type: "uint256";
    }];
    readonly name: "runHooks";
    readonly outputs: readonly [{
        readonly name: "passed";
        readonly type: "bool";
    }, {
        readonly name: "reason";
        readonly type: "string";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}];
export declare const SALARY_INDEX_ABI: readonly [{
    readonly inputs: readonly [{
        readonly name: "role";
        readonly type: "string";
    }, {
        readonly name: "region";
        readonly type: "string";
    }];
    readonly name: "indexFor";
    readonly outputs: readonly [{
        readonly name: "price";
        readonly type: "int256";
    }, {
        readonly name: "updatedAt";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}];
export declare const PAYROLL_ATTESTOR_ABI: readonly [{
    readonly inputs: readonly [{
        readonly name: "payrollId";
        readonly type: "uint256";
    }, {
        readonly name: "cycleNumber";
        readonly type: "uint256";
    }, {
        readonly name: "employer";
        readonly type: "address";
    }, {
        readonly name: "token";
        readonly type: "address";
    }, {
        readonly name: "tokenSymbol";
        readonly type: "string";
    }];
    readonly name: "attestCycle";
    readonly outputs: readonly [{
        readonly type: "bytes32[]";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "schemaUID";
    readonly outputs: readonly [{
        readonly type: "bytes32";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}];
