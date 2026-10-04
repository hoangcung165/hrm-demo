package com.hrmdemo.mapper.auth;

import com.hrmdemo.dto.auth.AccountResponse;
import com.hrmdemo.entity.auth.Account;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface AccountMapper {

    @Mapping(target = "roles", expression = "java(account.roleNames())")
    AccountResponse toResponse(Account account);
}
