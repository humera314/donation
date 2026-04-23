import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
};

describe('Auth Controller', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('POST /auth/register calls authService.register', async () => {
    const dto = { firstName: 'Ahmed', lastName: 'Ali', email: 'ahmed@example.com', phone: '0123456789', password: 'secret123' };
    mockAuthService.register.mockResolvedValue({ id: 1, email: dto.email });

    const result = await controller.register(dto);

    expect(mockAuthService.register).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 1, email: dto.email });
  });

  it('POST /auth/login calls authService.login', async () => {
    const dto = { email: 'ahmed@example.com', password: 'secret123' };
    mockAuthService.login.mockResolvedValue({ access_token: 'mock-token' });

    const result = await controller.login(dto);

    expect(mockAuthService.login).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ access_token: 'mock-token' });
  });
});
