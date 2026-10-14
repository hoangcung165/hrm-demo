package com.hrmdemo.service.project;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hrmdemo.dto.project.LoadPart;
import com.hrmdemo.dto.project.LoadPeriodView;
import com.hrmdemo.entity.project.Project;
import com.hrmdemo.service.allocation.LoadPeriod;

/** Turns the periods of the Bộ tính phân bổ into the response records, naming each project that adds up. */
public final class LoadViews {

    private LoadViews() {
    }

    /**
     * @param named       the projects that appear in the periods, by id; a missing one is shown without code and name
     * @param thisProject the project the screen is about (marked in each part), or null for none
     */
    public static List<LoadPeriodView> of(List<LoadPeriod> periods, Map<UUID, Project> named, UUID thisProject) {
        List<LoadPeriodView> views = new ArrayList<>();
        for (LoadPeriod period : periods) {
            List<LoadPart> parts = period.parts().stream().map(part -> {
                Project p = named.get(part.projectId());
                return new LoadPart(part.projectId(), p == null ? null : p.getCode(), p == null ? null : p.getName(),
                        part.percent(), part.projectId().equals(thisProject));
            }).toList();
            views.add(new LoadPeriodView(period.from(), period.to(), period.totalPercent(), period.overloaded(),
                    parts));
        }
        return views;
    }
}
