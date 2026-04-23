import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './users.entity';

const mockUser: User = {
  id: 1,
  firstName: 'Ahmed',
  lastName: 'Ali',
  email: 'ahmed@example.com',
  phone: '0123456789',
  password: 'hashedpassword',
  role: 'user',
};

const safeUser = { id: 1, firstName: 'Ahmed', lastName: 'Ali', email: 'ahmed@example.com', phone: '0123456789', role: 'user' };

const mockUsersRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockUsersRepository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return users without passwords', async () => {
      mockUsersRepository.find.mockResolvedValue([mockUser]);

      const result = await service.findAll();

      expect(result).toEqual([safeUser]);
      expect((result[0] as any).password).toBeUndefined();
    });

    it('should return empty array when no users', async () => {
      mockUsersRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a user without password', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne(1);

      expect(mockUsersRepository.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(safeUser);
      expect((result as any).password).toBeUndefined();
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockUsersRepository.findOne.mockResolvedValue(undefined);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return a new user', async () => {
      const dto = {
        firstName: 'Ahmed',
        lastName: 'Ali',
        email: 'ahmed@example.com',
        phone: '0123456789',
        password: 'hashedpassword',
      };
      mockUsersRepository.create.mockReturnValue(mockUser);
      mockUsersRepository.save.mockResolvedValue(mockUser);

      const result = await service.create(dto);

      expect(mockUsersRepository.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockUser);
    });
  });

  describe('findByEmail', () => {
    it('should return a user when email exists', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('ahmed@example.com');

      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({ where: { email: 'ahmed@example.com' } });
      expect(result).toEqual(mockUser);
    });

    it('should return undefined when email not found', async () => {
      mockUsersRepository.findOne.mockResolvedValue(undefined);

      const result = await service.findByEmail('unknown@example.com');

      expect(result).toBeUndefined();
    });
  });

  describe('updateRole', () => {
    it('should update role and return user without password', async () => {
      mockUsersRepository.findOne.mockResolvedValue({ ...mockUser });
      mockUsersRepository.save.mockResolvedValue({ ...mockUser, role: 'admin' });

      const result = await service.updateRole(1, 'admin');

      expect(result.role).toBe('admin');
      expect((result as any).password).toBeUndefined();
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockUsersRepository.findOne.mockResolvedValue(undefined);

      await expect(service.updateRole(99, 'admin')).rejects.toThrow(NotFoundException);
    });
  });
});
