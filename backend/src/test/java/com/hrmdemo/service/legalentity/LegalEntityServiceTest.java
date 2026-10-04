package com.hrmdemo.service.legalentity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.config.CurrentLegalEntity;
import com.hrmdemo.dto.legalentity.CompanyInfoRequest;
import com.hrmdemo.dto.legalentity.CompanyInfoResponse;
import com.hrmdemo.dto.legalentity.CompanyLogo;
import com.hrmdemo.entity.legalentity.LegalEntity;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.mapper.legalentity.LegalEntityMapper;
import com.hrmdemo.repository.legalentity.LegalEntityRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScopeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class LegalEntityServiceTest {

    static final Instant NOW = Instant.parse("2026-10-04T08:00:00Z");
    static final UUID LEGAL_ENTITY_ID = UUID.fromString("00000000-0000-0000-0000-0000000000aa");
    static final CurrentAccount ADMIN = account("ADMIN");
    static final CompanyInfoResponse RESPONSE = new CompanyInfoResponse("Acme", null, null, null, null, null, NOW);

    @Mock
    LegalEntityRepository legalEntities;
    @Mock
    CurrentLegalEntity currentLegalEntity;
    @Mock
    LegalEntityMapper mapper;
    @Mock
    LegalEntity legalEntity;

    LegalEntityService service;

    @BeforeEach
    void setUp() {
        service = new LegalEntityService(legalEntities, currentLegalEntity, new AccessScopeService(), mapper,
                Clock.fixed(NOW, ZoneOffset.UTC));
        lenient().when(currentLegalEntity.id()).thenReturn(LEGAL_ENTITY_ID);
        lenient().when(legalEntities.findById(LEGAL_ENTITY_ID)).thenReturn(Optional.of(legalEntity));
        lenient().when(mapper.toCompanyInfo(legalEntity)).thenReturn(RESPONSE);
    }

    @Test
    void theAdminUpdatesCompanyInfo() {
        var request = new CompanyInfoRequest("  Acme  ", "0123456789", " 1 Main St ", "", "Director");

        assertThat(service.updateCompanyInfo(ADMIN, request)).isEqualTo(RESPONSE);

        // Text is trimmed and blank optional fields are stored as null.
        verify(legalEntity).updateInfo("Acme", "0123456789", "1 Main St", null, "Director", NOW);
    }

    @ParameterizedTest
    @ValueSource(strings = {"HR", "DIRECTOR", "ACCOUNTANT", "LINE_MANAGER", "PROJECT_MANAGER", "EMPLOYEE"})
    void nobodyButTheAdminMayChangeCompanyInfoOrLogo(String role) {
        CurrentAccount caller = account(role);
        var request = new CompanyInfoRequest("Acme", null, null, null, null);

        assertForbidden(() -> service.updateCompanyInfo(caller, request));
        assertForbidden(() -> service.storeLogo(caller, SampleImages.PNG));
        assertForbidden(() -> service.removeLogo(caller));

        verifyNoInteractions(legalEntities, legalEntity);
    }

    @Test
    void theAdminStoresALogoWithTheTypeFoundInItsBytes() {
        service.storeLogo(ADMIN, SampleImages.WEBP);

        verify(legalEntities).storeLogo(LEGAL_ENTITY_ID, SampleImages.WEBP, "image/webp", NOW);
    }

    @Test
    void aLogoOfExactlyOneMegabyteIsAccepted() {
        byte[] content = SampleImages.pngOfSize(LegalEntityService.MAX_LOGO_BYTES);

        service.storeLogo(ADMIN, content);

        verify(legalEntities).storeLogo(LEGAL_ENTITY_ID, content, "image/png", NOW);
    }

    @Test
    void aLogoAboveOneMegabyteIsRejected() {
        assertCode(() -> service.storeLogo(ADMIN, SampleImages.pngOfSize(LegalEntityService.MAX_LOGO_BYTES + 1)),
                413, "company.logo_too_large");

        verify(legalEntities, never()).storeLogo(any(), any(), any(), any());
    }

    @Test
    void aLogoThatIsNotPngJpegOrWebpIsRejected() {
        assertCode(() -> service.storeLogo(ADMIN, SampleImages.SVG), 415, "company.logo_unsupported_type");

        verify(legalEntities, never()).storeLogo(any(), any(), any(), any());
    }

    @Test
    void anEmptyLogoFileIsRejected() {
        assertCode(() -> service.storeLogo(ADMIN, new byte[0]), 400, "company.logo_missing");
        assertCode(() -> service.storeLogo(ADMIN, null), 400, "company.logo_missing");
    }

    @Test
    void theAdminRemovesTheLogo() {
        service.removeLogo(ADMIN);

        verify(legalEntities).removeLogo(LEGAL_ENTITY_ID, NOW);
    }

    @Test
    void theLogoIsServedWithItsStoredTypeAndAVersion() {
        when(legalEntity.hasLogo()).thenReturn(true);
        when(legalEntity.getId()).thenReturn(LEGAL_ENTITY_ID);
        when(legalEntity.getLogoContentType()).thenReturn("image/png");
        when(legalEntity.getLogoUpdatedAt()).thenReturn(NOW);
        when(legalEntities.findLogo(LEGAL_ENTITY_ID)).thenReturn(SampleImages.PNG);

        CompanyLogo logo = service.logo();

        assertThat(logo.content()).isEqualTo(SampleImages.PNG);
        assertThat(logo.contentType()).isEqualTo("image/png");
        assertThat(logo.version()).isEqualTo(NOW.toEpochMilli());
    }

    @Test
    void askingForTheLogoWhenThereIsNoneIsNotFound() {
        when(legalEntity.hasLogo()).thenReturn(false);

        assertCode(() -> service.logo(), 404, "company.logo_not_found");
    }

    @Test
    void defaultCompanyInfoIsFilledInWhileTheCompanyStillHasItsInstallationName() {
        when(legalEntity.getName()).thenReturn(LegalEntityService.DEFAULT_NAME);
        var request = new CompanyInfoRequest("Example JSC", "0312345678", "1 Main St", "Pham Quoc Bao", "Director");

        assertThat(service.fillDefaultCompanyInfo(request)).isTrue();

        verify(legalEntity).updateInfo("Example JSC", "0312345678", "1 Main St", "Pham Quoc Bao", "Director", NOW);
        // The logo is written only through the repository, which is not used here.
        verify(legalEntities, never()).storeLogo(any(), any(), any(), any());
        verify(legalEntities, never()).removeLogo(any(), any());
    }

    @Test
    void defaultCompanyInfoNeverOverwritesACompanyTheAdminRenamed() {
        when(legalEntity.getName()).thenReturn("Acme Software JSC");

        assertThat(service.fillDefaultCompanyInfo(new CompanyInfoRequest("Example JSC", null, null, null, null)))
                .isFalse();

        verify(legalEntity, never()).updateInfo(any(), any(), any(), any(), any(), any());
    }

    private static CurrentAccount account(String role) {
        return new CurrentAccount(UUID.randomUUID(), Set.of(role));
    }

    private static void assertForbidden(Runnable action) {
        assertCode(action, 403, "auth.forbidden");
    }

    private static void assertCode(Runnable action, int status, String code) {
        assertThatThrownBy(action::run).isInstanceOfSatisfying(ApiException.class, ex -> {
            assertThat(ex.getStatus().value()).isEqualTo(status);
            assertThat(ex.getCode()).isEqualTo(code);
        });
    }
}
