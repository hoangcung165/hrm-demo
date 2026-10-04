package com.hrmdemo.mapper.legalentity;

import com.hrmdemo.dto.legalentity.CompanyInfoResponse;
import com.hrmdemo.entity.legalentity.LegalEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.Named;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface LegalEntityMapper {

    String LOGO_PATH = "/api/company/logo";

    @Mapping(target = "logoUrl", source = "legalEntity", qualifiedByName = "logoUrl")
    CompanyInfoResponse toCompanyInfo(LegalEntity legalEntity);

    /** The version in the URL changes with every upload, so browsers may cache the image for good. */
    @Named("logoUrl")
    default String logoUrl(LegalEntity legalEntity) {
        return legalEntity.hasLogo() ? LOGO_PATH + "?v=" + legalEntity.getLogoUpdatedAt().toEpochMilli() : null;
    }
}
