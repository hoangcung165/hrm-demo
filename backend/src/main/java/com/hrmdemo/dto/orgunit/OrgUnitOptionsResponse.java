package com.hrmdemo.dto.orgunit;

import java.util.List;

/**
 * Every unit of the company, inactive ones included, in tree order: parents before their children, siblings in
 * display order.
 */
public record OrgUnitOptionsResponse(List<OrgUnitOption> items) {
}
