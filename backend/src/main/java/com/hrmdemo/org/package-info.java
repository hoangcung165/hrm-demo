/**
 * Context org: Pháp nhân, cơ cấu tổ chức, Tài khoản và phân quyền, danh mục, luồng duyệt, thông báo, audit log.
 * Thuật ngữ: docs/contexts/org/CONTEXT.md.
 * <p>
 * Package gốc là API công khai cho module khác. Các package con
 * (controller, service, repository, entity, dto, mapper) là nội bộ.
 */
@ApplicationModule(displayName = "Org")
package com.hrmdemo.org;

import org.springframework.modulith.ApplicationModule;
