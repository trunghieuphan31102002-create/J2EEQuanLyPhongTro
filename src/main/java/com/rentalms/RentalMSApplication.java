package com.rentalms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class RentalMSApplication {
    public static void main(String[] args) {
        SpringApplication.run(RentalMSApplication.class, args);
        System.out.println("\n========================================");
        System.out.println("  RentalMS - He thong quan ly phong tro");
        System.out.println("  http://localhost:8080");
        System.out.println("  H2 Console: http://localhost:8080/h2-console");
        System.out.println("  API Docs  : http://localhost:8080/api");
        System.out.println("========================================\n");
    }
}
