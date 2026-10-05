package com.hrmdemo.mapper.auth;

import com.hrmdemo.dto.accessscope.DataScope;
import com.hrmdemo.dto.auth.AccountResponse;
import com.hrmdemo.entity.auth.Account;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface AccountMapper {

    /** @param dataScope the widest data scope of the Account's roles, from the Access scope rules */
    @Mapping(target = "id", source = "account.id")
    @Mapping(target = "email", source = "account.email")
    @Mapping(target = "fullName", source = "account.fullName")
    @Mapping(target = "roles", expression = "java(account.roleNames())")
    @Mapping(target = "dataScope", source = "dataScope")
    @Mapping(target = "status", source = "account.status")
    @Mapping(target = "createdAt", source = "account.createdAt")
    // Employees arrive with HRM-06, demo personas later in HRM-04.
    @Mapping(target = "employee", ignore = true)
    @Mapping(target = "demoPersona", ignore = true)
    AccountResponse toResponse(Account account, DataScope dataScope);
}
