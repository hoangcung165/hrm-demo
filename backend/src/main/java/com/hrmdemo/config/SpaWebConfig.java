package com.hrmdemo.config;

import java.io.IOException;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

/**
 * Serves the web app that is packaged into the jar under {@code static/} (ADR 0001).
 * The SPA owns its routes, so a path that is not a file and not a backend path returns {@code index.html};
 * React Router then shows the right screen, also after a page reload or from a link in an email.
 */
@Configuration(proxyBeanMethods = false)
public class SpaWebConfig implements WebMvcConfigurer {

    private static final String[] BACKEND_PREFIXES = {"api/", "actuator/", "v3/", "swagger-ui/"};

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new SpaResourceResolver());
    }

    static class SpaResourceResolver extends PathResourceResolver {

        @Override
        protected Resource getResource(String resourcePath, Resource location) throws IOException {
            Resource requested = super.getResource(resourcePath, location);
            if (requested != null) {
                return requested;
            }
            if (isBackendPath(resourcePath) || looksLikeFile(resourcePath)) {
                return null;
            }
            Resource index = location.createRelative("index.html");
            return index.isReadable() ? index : null;
        }

        static boolean isBackendPath(String path) {
            for (String prefix : BACKEND_PREFIXES) {
                if (path.startsWith(prefix) || path.equals(prefix.substring(0, prefix.length() - 1))) {
                    return true;
                }
            }
            return false;
        }

        /** A missing {@code /assets/app.js} must be a 404, not the HTML page. */
        static boolean looksLikeFile(String path) {
            String lastSegment = path.substring(path.lastIndexOf('/') + 1);
            return lastSegment.contains(".");
        }
    }
}
