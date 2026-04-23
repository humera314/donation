import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

const mockReflector = { getAllAndOverride: jest.fn() };

const mockContext = (role: string | null) => ({
  getHandler: jest.fn(),
  getClass: jest.fn(),
  switchToHttp: () => ({
    getRequest: () => ({ user: role ? { role } : null }),
  }),
});

describe('RolesGuard', () => {
  let guard: RolesGuard;

  beforeEach(() => {
    guard = new RolesGuard(mockReflector as unknown as Reflector);
    jest.clearAllMocks();
  });

  it('should allow access when no roles are required', () => {
    mockReflector.getAllAndOverride.mockReturnValue(null);

    const result = guard.canActivate(mockContext('user') as any);

    expect(result).toBe(true);
  });

  it('should allow access when user has the required role', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['admin']);

    const result = guard.canActivate(mockContext('admin') as any);

    expect(result).toBe(true);
  });

  it('should throw ForbiddenException when user lacks the required role', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['admin']);

    expect(() => guard.canActivate(mockContext('user') as any)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user is not authenticated', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['admin']);

    expect(() => guard.canActivate(mockContext(null) as any)).toThrow(ForbiddenException);
  });
});
