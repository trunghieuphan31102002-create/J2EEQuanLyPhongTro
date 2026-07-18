package com.rentalms;

import com.rentalms.entity.User;
import com.rentalms.enums.UserRole;
import com.rentalms.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class RentalMSApplicationTests {

    @Autowired UserRepository userRepo;
    @Autowired PasswordEncoder encoder;

    @Test
    void contextLoads() {
        assertThat(userRepo).isNotNull();
    }

    @Test
    void testUserCreation() {
        User user = User.builder()
                .email("test@test.com")
                .passwordHash(encoder.encode("password"))
                .fullName("Test User")
                .role(UserRole.TENANT)
                .active(true)
                .build();
        User saved = userRepo.save(user);
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getEmail()).isEqualTo("test@test.com");
        assertThat(userRepo.findByEmail("test@test.com")).isPresent();
    }
}
