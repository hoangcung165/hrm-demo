package com.hrmdemo.service.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.catalog.CatalogItemRequest;
import com.hrmdemo.entity.catalog.Catalog;
import com.hrmdemo.entity.catalog.CatalogItem;
import com.hrmdemo.entity.catalog.CatalogItemFields;
import com.hrmdemo.entity.catalog.ContractTerm;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.catalog.CatalogItemRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.legalentity.LegalEntityService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

/** Rules of the catalogs that the API test cannot reach: items in use, and the order of the checks. */
@ExtendWith(MockitoExtension.class)
class CatalogServiceTest {

    static final Instant NOW = Instant.parse("2026-10-06T08:00:00Z");
    static final CurrentAccount ADMIN = new CurrentAccount(UUID.randomUUID(), Set.of("ADMIN"));
    static final CurrentAccount HR = new CurrentAccount(UUID.randomUUID(), Set.of("HR"));

    @Mock
    CatalogItemRepository items;
    @Mock
    CatalogUsage usage;
    @Mock
    LegalEntityService legalEntityService;

    CatalogService service;

    @BeforeEach
    void setUp() {
        service = new CatalogService(items, usage, new AccessScopeService(employeeId -> Set.of()), legalEntityService,
                Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void anItemInUseIsNotDeletedButCanBeDeactivated() {
        CatalogItem position = stored(Catalog.POSITION, "TP", "Trưởng phòng");
        when(usage.inUse(Catalog.POSITION, List.of(position.getId()))).thenReturn(Set.of(position.getId()));

        assertThatThrownBy(() -> service.delete(ADMIN, "positions", position.getId()))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.getStatus()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(ex.getCode()).isEqualTo("catalog.item_in_use");
                });
        verify(items, never()).delete(any(CatalogItem.class));

        var deactivated = service.deactivate(ADMIN, "positions", position.getId());
        assertThat(deactivated.active()).isFalse();
        assertThat(deactivated.inUse()).isTrue();
    }

    @Test
    void thePermissionIsCheckedBeforeTheLockAndTheLockBeforeTheItemIsRead() {
        assertThatThrownBy(() -> service.delete(HR, "positions", UUID.randomUUID()))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verifyNoInteractions(legalEntityService, items);

        CatalogItem skill = stored(Catalog.SKILL, "SQL", "SQL");
        service.deactivate(ADMIN, "skills", skill.getId());
        InOrder order = inOrder(legalEntityService, items);
        order.verify(legalEntityService).lockForStructureChange();
        order.verify(items).findByIdAndCatalog(skill.getId(), Catalog.SKILL);
    }

    @Test
    void eachCatalogTakesItsOwnFieldsOnly() {
        CatalogItemFields fixed = CatalogService.fields(Catalog.CONTRACT_TYPE,
                new CatalogItemRequest("xdth", "HĐLĐ xác định thời hạn", "FIXED", 36, null, null, null, null));
        assertThat(fixed.code()).isEqualTo("XDTH");
        assertThat(fixed.term()).isEqualTo(ContractTerm.FIXED);
        assertThat(fixed.maxMonths()).isEqualTo(36);

        CatalogItemFields holiday = CatalogService.fields(Catalog.HOLIDAY, new CatalogItemRequest(null,
                "Quốc khánh", null, null, null, null, LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 2)));
        assertThat(holiday.code()).isNull();
        assertThat(holiday.endDate()).isEqualTo(LocalDate.of(2026, 9, 2));

        assertInvalid(Catalog.CONTRACT_TYPE, new CatalogItemRequest("TV", "Thử việc", "TRIAL", null, null, null,
                null, null), "term");
        assertInvalid(Catalog.ALLOWANCE_TYPE, new CatalogItemRequest("AN", "Ăn trưa", null, null, true, null, null,
                null), "taxable");
        assertInvalid(Catalog.SKILL, new CatalogItemRequest("SQL", "SQL", "FIXED", null, null, null, null, null),
                "term");
        assertInvalid(Catalog.HOLIDAY, new CatalogItemRequest(null, "Ten days and one", null, null, null, null,
                LocalDate.of(2026, 3, 1), LocalDate.of(2026, 3, 11)), "endDate");
        // Ten days, both ends included, are allowed.
        assertThat(CatalogService.fields(Catalog.HOLIDAY, new CatalogItemRequest(null, "Ten days", null, null, null,
                null, LocalDate.of(2026, 3, 1), LocalDate.of(2026, 3, 10))).startDate())
                .isEqualTo(LocalDate.of(2026, 3, 1));
    }

    private CatalogItem stored(Catalog catalog, String code, String name) {
        CatalogItem item = new CatalogItem(catalog,
                new CatalogItemFields(code, name, null, null, null, null, null, null), NOW);
        ReflectionTestUtils.setField(item, "id", UUID.randomUUID());
        when(items.findByIdAndCatalog(item.getId(), catalog)).thenReturn(Optional.of(item));
        return item;
    }

    private static void assertInvalid(Catalog catalog, CatalogItemRequest request, String field) {
        assertThatThrownBy(() -> CatalogService.fields(catalog, request))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.getCode()).isEqualTo("validation.invalid");
                    assertThat(ex.getMessage()).endsWith(field);
                });
    }
}
