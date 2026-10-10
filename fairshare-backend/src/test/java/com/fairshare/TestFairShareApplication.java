package com.fairshare;

import org.springframework.boot.SpringApplication;

public class TestFairShareApplication {

	public static void main(String[] args) {
		SpringApplication.from(FairShareApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
