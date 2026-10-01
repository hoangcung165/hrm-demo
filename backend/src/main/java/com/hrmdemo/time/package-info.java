/**
 * Context time: Ca làm việc, chấm công, bảng công, tăng ca (OT), nghỉ phép và số dư phép.
 * Thuật ngữ: docs/contexts/time/CONTEXT.md.
 * <p>
 * Package gốc là API công khai cho module khác. Các package con
 * (controller, service, repository, entity, dto, mapper) là nội bộ.
 */
@ApplicationModule(displayName = "Time")
package com.hrmdemo.time;

import org.springframework.modulith.ApplicationModule;
