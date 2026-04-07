package com.SCEMAS.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

// for testing something, will be removed later
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import com.google.cloud.spring.autoconfigure.core.GcpContextAutoConfiguration;
import com.google.cloud.spring.autoconfigure.firestore.GcpFirestoreAutoConfiguration;

@SpringBootTest
@EnableAutoConfiguration(exclude = {
    GcpContextAutoConfiguration.class,
    GcpFirestoreAutoConfiguration.class
})
class BackendApplicationTests {

    @Test
    void contextLoads() {
        // This test simply verifies that the Spring context loads
    }
}
