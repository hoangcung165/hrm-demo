package com.hrmdemo.entity.catalog;

/** How long a contract of a Loại hợp đồng runs (Bộ luật Lao động 2019, Điều 20 and Điều 24). */
public enum ContractTerm {
    /** Không xác định thời hạn. */
    INDEFINITE,
    /** Xác định thời hạn: at most 36 months. */
    FIXED,
    /** Thử việc. */
    PROBATION
}
