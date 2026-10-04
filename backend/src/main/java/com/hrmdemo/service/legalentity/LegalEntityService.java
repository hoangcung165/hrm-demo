package com.hrmdemo.service.legalentity;

import java.time.Clock;

import com.hrmdemo.config.CurrentLegalEntity;
import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.legalentity.CompanyInfoRequest;
import com.hrmdemo.dto.legalentity.CompanyInfoResponse;
import com.hrmdemo.dto.legalentity.CompanyLogo;
import com.hrmdemo.entity.legalentity.LegalEntity;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.mapper.legalentity.LegalEntityMapper;
import com.hrmdemo.repository.legalentity.LegalEntityRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScopeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Company info and logo of the single Pháp nhân (ADR 0003). There is deliberately no way to create, list,
 * delete or switch Legal entities.
 */
@Service
@RequiredArgsConstructor
public class LegalEntityService {

    /** 1 MB. Keep {@code spring.servlet.multipart.max-file-size} at or above this. */
    public static final int MAX_LOGO_BYTES = 1024 * 1024;

    /** Name the installation gives the Legal entity (migration {@code create_legal_entity}). */
    public static final String DEFAULT_NAME = "Company";

    private final LegalEntityRepository legalEntities;
    private final CurrentLegalEntity currentLegalEntity;
    private final AccessScopeService accessScopes;
    private final LegalEntityMapper mapper;
    private final Clock clock;

    @Transactional(readOnly = true)
    public CompanyInfoResponse companyInfo() {
        return mapper.toCompanyInfo(current());
    }

    @Transactional
    public CompanyInfoResponse updateCompanyInfo(CurrentAccount account, CompanyInfoRequest request) {
        accessScopes.scopeOf(account).require(Permission.COMPANY_EDIT);
        LegalEntity legalEntity = current();
        legalEntity.updateInfo(request.name(), request.taxCode(), request.address(),
                request.legalRepresentativeName(), request.legalRepresentativeTitle(), clock.instant());
        return mapper.toCompanyInfo(legalEntity);
    }

    /**
     * Fills in company info while the company still has the name the installation gave it, so nothing the
     * Admin entered is ever overwritten. For code that runs without a signed-in Account (startup seeders):
     * no permission check, never call it on behalf of a request. The logo is not touched.
     *
     * @return whether the info was written
     */
    @Transactional
    public boolean fillDefaultCompanyInfo(CompanyInfoRequest request) {
        LegalEntity legalEntity = current();
        if (!DEFAULT_NAME.equals(legalEntity.getName())) {
            return false;
        }
        legalEntity.updateInfo(request.name(), request.taxCode(), request.address(),
                request.legalRepresentativeName(), request.legalRepresentativeTitle(), clock.instant());
        return true;
    }

    @Transactional
    public CompanyInfoResponse storeLogo(CurrentAccount account, byte[] content) {
        accessScopes.scopeOf(account).require(Permission.COMPANY_EDIT);
        if (content == null || content.length == 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "company.logo_missing", "Logo file is missing or empty");
        }
        if (content.length > MAX_LOGO_BYTES) {
            throw logoTooLarge();
        }
        LogoImageType type = LogoImageType.detect(content)
                .orElseThrow(() -> new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                        "company.logo_unsupported_type", "Logo must be a PNG, JPEG or WebP image"));
        legalEntities.storeLogo(currentLegalEntity.id(), content, type.contentType(), clock.instant());
        return mapper.toCompanyInfo(current());
    }

    @Transactional
    public CompanyInfoResponse removeLogo(CurrentAccount account) {
        accessScopes.scopeOf(account).require(Permission.COMPANY_EDIT);
        legalEntities.removeLogo(currentLegalEntity.id(), clock.instant());
        return mapper.toCompanyInfo(current());
    }

    /** Public: the logo is shown before sign-in and in {@code <img>} tags, which send no access token. */
    @Transactional(readOnly = true)
    public CompanyLogo logo() {
        LegalEntity legalEntity = current();
        if (!legalEntity.hasLogo()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "company.logo_not_found", "The company has no logo");
        }
        return new CompanyLogo(legalEntities.findLogo(legalEntity.getId()), legalEntity.getLogoContentType(),
                legalEntity.getLogoUpdatedAt().toEpochMilli());
    }

    /**
     * Lets one change at a time through for the whole company: the caller's transaction holds a lock on the
     * Legal entity row until it ends, and whatever it reads afterwards includes the previous holder's changes.
     * For changes whose checks span many rows, e.g. the org tree (no cycle, unique code, empty before delete).
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void lockForStructureChange() {
        legalEntities.findForUpdate(currentLegalEntity.id())
                .orElseThrow(() -> new IllegalStateException("The Legal entity row is missing"));
    }

    public static ApiException logoTooLarge() {
        return new ApiException(HttpStatus.valueOf(413), "company.logo_too_large", "Logo must be at most 1 MB");
    }

    private LegalEntity current() {
        return legalEntities.findById(currentLegalEntity.id())
                .orElseThrow(() -> new IllegalStateException("The Legal entity row is missing"));
    }
}
