import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './users.entity';
import { CreateUserDto } from './dto/create-user.dto';

type SafeUser = Omit<User, 'password'>;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll(): Promise<SafeUser[]> {
    const users = await this.usersRepository.find();
    return users.map(({ password, ...rest }) => rest);
  }

  async findOne(id: number): Promise<SafeUser> {
    const user = await this.usersRepository.findOne(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    const { password, ...rest } = user;
    return rest;
  }

  create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create(createUserDto);
    return this.usersRepository.save(user);
  }

  findByEmail(email: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async updateRole(id: number, role: string): Promise<SafeUser> {
    const user = await this.usersRepository.findOne(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    user.role = role;
    const saved = await this.usersRepository.save(user);
    const { password, ...rest } = saved;
    return rest;
  }
}
