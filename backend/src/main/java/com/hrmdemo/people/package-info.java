/**
 * Context people: Hồ sơ nhân viên, kỹ năng, hợp đồng, thử việc, quá trình công tác, nghỉ việc.
 * Thuật ngữ: docs/contexts/people/CONTEXT.md.
 * <p>
 * Package gốc là API công khai cho module khác. Các package con
 * (controller, service, repository, entity, dto, mapper) là nội bộ.
 */
@ApplicationModule(displayName = "People")
package com.hrmdemo.people;

import org.springframework.modulith.ApplicationModule;
