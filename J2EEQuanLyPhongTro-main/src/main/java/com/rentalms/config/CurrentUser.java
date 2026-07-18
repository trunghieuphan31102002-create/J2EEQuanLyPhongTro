package com.rentalms.config;

import com.rentalms.entity.User;
import com.rentalms.exception.BusinessException;
import com.rentalms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CurrentUser {

    private final UserRepository userRepo;

    public User get() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new BusinessException("Chua dang nhap");
        }
        String email = auth.getName();
        return userRepo.findByEmail(email)
                .orElseThrow(() -> new BusinessException("Khong tim thay nguoi dung"));
    }

    public Long getId() {
        return get().getId();
    }
}
