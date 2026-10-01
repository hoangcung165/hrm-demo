/**
 * Context payroll: Kỳ lương, thành phần lương, BHXH, thuế TNCN, duyệt/khóa lương, phiếu lương.
 * Thuật ngữ: docs/contexts/payroll/CONTEXT.md.
 * <p>
 * Package gốc là API công khai cho module khác. Các package con
 * (controller, service, repository, entity, dto, mapper) là nội bộ.
 */
@ApplicationModule(displayName = "Payroll")
package com.hrmdemo.payroll;

import org.springframework.modulith.ApplicationModule;
