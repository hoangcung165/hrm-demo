package com.hrmdemo.controller.resource;

import com.hrmdemo.dto.resource.ResourceSettingsRequest;
import com.hrmdemo.dto.resource.ResourceSettingsResponse;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.resource.ResourceSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Ngưỡng nguồn lực of the heatmap, Bench and Sắp hết dự án. Reading needs RESOURCE_VIEW, changing RESOURCE_EDIT. */
@RestController
@RequestMapping("/api/resource-settings")
@RequiredArgsConstructor
public class ResourceSettingsController {

    private final ResourceSettingsService settings;

    @GetMapping
    @Operation(summary = "The thresholds in force (the defaults until the company saves its own)")
    ResourceSettingsResponse get(@Parameter(hidden = true) CurrentAccount caller) {
        return settings.get(caller);
    }

    @PutMapping
    @Operation(summary = "Save the thresholds; every failing field is reported at once")
    ResourceSettingsResponse update(@Parameter(hidden = true) CurrentAccount caller,
            @RequestBody ResourceSettingsRequest request) {
        return settings.update(caller, request);
    }

    @DeleteMapping
    @Operation(summary = "Restore the default thresholds")
    ResourceSettingsResponse restoreDefaults(@Parameter(hidden = true) CurrentAccount caller) {
        return settings.restoreDefaults(caller);
    }
}
