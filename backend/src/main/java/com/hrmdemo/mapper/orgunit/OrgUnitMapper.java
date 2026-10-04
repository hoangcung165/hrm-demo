package com.hrmdemo.mapper.orgunit;

import com.hrmdemo.dto.orgunit.OrgUnitHead;
import com.hrmdemo.dto.orgunit.OrgUnitRef;
import com.hrmdemo.dto.orgunit.OrgUnitResponse;
import com.hrmdemo.entity.orgunit.OrgUnit;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface OrgUnitMapper {

    /** The head and the counts are not stored on the unit; the service works them out from the tree. */
    @Mapping(target = "id", source = "unit.id")
    @Mapping(target = "code", source = "unit.code")
    @Mapping(target = "name", source = "unit.name")
    @Mapping(target = "type", source = "unit.type")
    @Mapping(target = "parentId", source = "unit.parentId")
    @Mapping(target = "active", source = "unit.active")
    @Mapping(target = "sortOrder", source = "unit.sortOrder")
    @Mapping(target = "head", source = "head")
    @Mapping(target = "headcountDirect", source = "headcountDirect")
    @Mapping(target = "headcountTotal", source = "headcountTotal")
    @Mapping(target = "childCount", source = "childCount")
    OrgUnitResponse toResponse(OrgUnit unit, OrgUnitHead head, long headcountDirect, long headcountTotal,
            int childCount);

    OrgUnitRef toRef(OrgUnit unit);
}
