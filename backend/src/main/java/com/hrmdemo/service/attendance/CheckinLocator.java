package com.hrmdemo.service.attendance;

import java.util.Collection;
import java.util.Comparator;
import java.util.UUID;

/**
 * Where a mobile check-in was made, against the active Địa điểm chấm công (HRM-39). Pure: no database, no clock.
 *
 * <p>The point is inside a place when its distance to the place is at most the place's radius. When it is inside
 * several, the nearest of those is the one recorded; when it is inside none, the nearest place is recorded with its
 * distance and the punch is Ngoài vùng. With no active place at all, there is no nearest place and the punch is
 * Ngoài vùng too. Sai số lớn: the reported accuracy is worse (larger) than the company maximum.
 */
public final class CheckinLocator {

    /** Mean Earth radius (IUGG), metres. */
    static final double EARTH_RADIUS_METERS = 6_371_008.8;

    /** An active place as the locator reads it. */
    public record Place(UUID id, String name, double latitude, double longitude, int radiusMeters) {
    }

    /**
     * @param place the place recorded, null when there is no active place
     * @param distanceMeters the distance to {@code place}, rounded to the metre; null with no place
     */
    public record Found(Place place, Integer distanceMeters, boolean outsideLocation, boolean lowAccuracy) {
    }

    private CheckinLocator() {
    }

    public static Found locate(double latitude, double longitude, double accuracyMeters, int maxAccuracyMeters,
            Collection<Place> places) {
        boolean lowAccuracy = accuracyMeters > maxAccuracyMeters;
        Place best = null;
        double bestDistance = Double.MAX_VALUE;
        boolean bestInside = false;
        for (Place place : places.stream().sorted(Comparator.comparing(Place::name)).toList()) {
            double distance = distanceMeters(latitude, longitude, place.latitude(), place.longitude());
            boolean inside = distance <= place.radiusMeters();
            // A place that contains the point beats one that does not; then the nearer wins.
            if ((inside && !bestInside) || (inside == bestInside && distance < bestDistance)) {
                best = place;
                bestDistance = distance;
                bestInside = inside;
            }
        }
        if (best == null) {
            return new Found(null, null, true, lowAccuracy);
        }
        return new Found(best, (int) Math.round(bestDistance), !bestInside, lowAccuracy);
    }

    /** Great-circle distance in metres (haversine), accurate to well under a metre at the radii used here. */
    static double distanceMeters(double lat1, double lon1, double lat2, double lon2) {
        double phi1 = Math.toRadians(lat1);
        double phi2 = Math.toRadians(lat2);
        double dPhi = Math.toRadians(lat2 - lat1);
        double dLambda = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dPhi / 2) * Math.sin(dPhi / 2)
                + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
        return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
    }
}
