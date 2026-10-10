package com.fairshare_backend;

import org.springframework.boot.SpringApplication;

public class TestFairshareBackendApplication {

	public static void main(String[] args) {
		SpringApplication.from(FairshareBackendApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
