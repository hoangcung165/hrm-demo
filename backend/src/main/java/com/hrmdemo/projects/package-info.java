/**
 * Context projects: Dự án, phân bổ nhân sự, resource heatmap, timesheet, chi phí dự án.
 * Thuật ngữ: docs/contexts/projects/CONTEXT.md.
 * <p>
 * Package gốc là API công khai cho module khác. Các package con
 * (controller, service, repository, entity, dto, mapper) là nội bộ.
 */
@ApplicationModule(displayName = "Projects")
package com.hrmdemo.projects;

import org.springframework.modulith.ApplicationModule;
