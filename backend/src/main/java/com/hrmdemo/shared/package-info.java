/**
 * Phần kỹ thuật dùng chung cho mọi module: cấu hình, xử lý lỗi API, DTO chung.
 * Không chứa nghiệp vụ. Module OPEN: mọi package con đều dùng được từ module khác.
 */
@ApplicationModule(displayName = "Shared", type = ApplicationModule.Type.OPEN)
package com.hrmdemo.shared;

import org.springframework.modulith.ApplicationModule;
