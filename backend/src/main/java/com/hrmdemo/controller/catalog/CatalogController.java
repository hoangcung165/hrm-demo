package com.hrmdemo.controller.catalog;

import java.util.UUID;

import com.hrmdemo.dto.PageResponse;
import com.hrmdemo.dto.catalog.CatalogItemRequest;
import com.hrmdemo.dto.catalog.CatalogItemResponse;
import com.hrmdemo.dto.catalog.CatalogListQuery;
import com.hrmdemo.dto.catalog.HolidayYearsResponse;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.catalog.CatalogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Danh mục (catalogs): {@code catalog} is {@code positions}, {@code contract-types}, {@code allowance-types},
 * {@code holidays}, {@code skills} or {@code project-roles}. Reading needs a signed-in Account; changes need
 * CATALOG_EDIT.
 */
@RestController
@RequestMapping("/api/catalogs")
@RequiredArgsConstructor
public class CatalogController {

    private final CatalogService catalogService;

    @GetMapping("/{catalog}/items")
    @Operation(summary = "One page of a catalog, by name (holidays by date); any signed-in Account")
    PageResponse<CatalogItemResponse> items(
            @PathVariable String catalog,
            @Parameter(description = "Page number, from 0") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Rows per page, 1 to 200") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Part of the name or the code; case and accents do not matter")
            @RequestParam(required = false) String q,
            @Parameter(schema = @Schema(allowableValues = {"ACTIVE", "INACTIVE"}))
            @RequestParam(required = false) String status,
            @Parameter(description = "Holidays only: those whose days touch this year")
            @RequestParam(required = false) Integer year) {
        return catalogService.items(catalog, new CatalogListQuery(page, size, q, status, year));
    }

    @GetMapping("/holidays/years")
    @Operation(summary = "The years in which the company has a holiday, ascending; any signed-in Account")
    HolidayYearsResponse holidayYears() {
        return catalogService.holidayYears();
    }

    @PostMapping("/{catalog}/items")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add an item to a catalog; needs CATALOG_EDIT")
    CatalogItemResponse create(@Parameter(hidden = true) CurrentAccount caller, @PathVariable String catalog,
            @Valid @RequestBody CatalogItemRequest request) {
        return catalogService.create(caller, catalog, request);
    }

    @PutMapping("/{catalog}/items/{id}")
    @Operation(summary = "Edit an item; its status does not change; needs CATALOG_EDIT")
    CatalogItemResponse update(@Parameter(hidden = true) CurrentAccount caller, @PathVariable String catalog,
            @PathVariable UUID id, @Valid @RequestBody CatalogItemRequest request) {
        return catalogService.update(caller, catalog, id, request);
    }

    @PostMapping("/{catalog}/items/{id}/deactivate")
    @Operation(summary = "Deactivate an item, also one in use; needs CATALOG_EDIT")
    CatalogItemResponse deactivate(@Parameter(hidden = true) CurrentAccount caller, @PathVariable String catalog,
            @PathVariable UUID id) {
        return catalogService.deactivate(caller, catalog, id);
    }

    @PostMapping("/{catalog}/items/{id}/reactivate")
    @Operation(summary = "Reactivate an item; needs CATALOG_EDIT")
    CatalogItemResponse reactivate(@Parameter(hidden = true) CurrentAccount caller, @PathVariable String catalog,
            @PathVariable UUID id) {
        return catalogService.reactivate(caller, catalog, id);
    }

    @DeleteMapping("/{catalog}/items/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete an item that nothing refers to; needs CATALOG_EDIT")
    void delete(@Parameter(hidden = true) CurrentAccount caller, @PathVariable String catalog,
            @PathVariable UUID id) {
        catalogService.delete(caller, catalog, id);
    }
}
