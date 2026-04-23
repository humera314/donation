import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /campaigns should return 200', () => {
    return request(app.getHttpServer())
      .get('/campaigns')
      .expect(200);
  });

  it('GET /users should return 200', () => {
    return request(app.getHttpServer())
      .get('/users')
      .expect(200);
  });

  it('GET /donations should return 200', () => {
    return request(app.getHttpServer())
      .get('/donations')
      .expect(200);
  });
});
