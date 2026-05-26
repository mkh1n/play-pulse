import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUsersService = {
    findByLogin: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    createProfile: jest.fn(),
    updateUser: jest.fn(),
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    getUsersStats: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
    decode: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const startTime = Date.now();
      
      const registerDto: RegisterDto = {
        login: 'testuser',
        password: 'password123',
      };

      // Мокаем полный объект пользователя с password_hash
      const mockUser = {
        id: 1,
        login: 'testuser',
        password_hash: 'hashed_password',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockUsersService.findByLogin.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);
      mockUsersService.createProfile.mockResolvedValue({ id: 1, user_id: 1 });
      mockJwtService.sign.mockReturnValue('fake_jwt_token');

      const result = await service.register(registerDto);

      const duration = Date.now() - startTime;
      console.log(`\n✅ [register] Test passed in ${duration}ms`);

      expect(mockUsersService.findByLogin).toHaveBeenCalledWith('testuser');
      expect(mockUsersService.create).toHaveBeenCalled();
      expect(mockUsersService.createProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 1,
          name: 'testuser',
          preferred_language: 'ru',
          total_likes: 0,
          total_dislikes: 0,
          total_games_added: 0,
        }),
      );
      expect(result.user).toBeDefined();
      // Проверяем, что password_hash не возвращается в ответе
      expect(result.user).not.toHaveProperty('password_hash');
      expect(result.token).toBe('fake_jwt_token');
    });

    it('should throw ConflictException if user already exists', async () => {
      const startTime = Date.now();
      
      const registerDto: RegisterDto = {
        login: 'existinguser',
        password: 'password123',
      };

      mockUsersService.findByLogin.mockResolvedValue({
        id: 1,
        login: 'existinguser',
        password_hash: 'hashed',
      });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);

      const duration = Date.now() - startTime;
      console.log(`\n✅ [register duplicate] Test passed in ${duration}ms`);
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const startTime = Date.now();
      
      const loginDto: LoginDto = {
        login: 'testuser',
        password: 'password123',
      };

      const hashedPassword = await bcrypt.hash('password123', 10);

      const mockUser = {
        id: 1,
        login: 'testuser',
        password_hash: hashedPassword,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockUsersService.findByLogin.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('fake_jwt_token');

      const result = await service.login(loginDto);

      const duration = Date.now() - startTime;
      console.log(`\n✅ [login] Test passed in ${duration}ms`);

      expect(mockUsersService.findByLogin).toHaveBeenCalledWith('testuser');
      expect(result.user).toBeDefined();
      // Проверяем, что password_hash не возвращается в ответе
      expect(result.user).not.toHaveProperty('password_hash');
      expect(result.token).toBe('fake_jwt_token');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const startTime = Date.now();
      
      const loginDto: LoginDto = {
        login: 'nonexistent',
        password: 'password123',
      };

      mockUsersService.findByLogin.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);

      const duration = Date.now() - startTime;
      console.log(`\n✅ [login not found] Test passed in ${duration}ms`);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const startTime = Date.now();
      
      const loginDto: LoginDto = {
        login: 'testuser',
        password: 'wrongpassword',
      };

      const hashedPassword = await bcrypt.hash('correctpassword', 10);

      mockUsersService.findByLogin.mockResolvedValue({
        id: 1,
        login: 'testuser',
        password_hash: hashedPassword,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);

      const duration = Date.now() - startTime;
      console.log(`\n✅ [login wrong password] Test passed in ${duration}ms`);
    });
  });

  describe('validateUser', () => {
    it('should return user if valid userId', async () => {
      const startTime = Date.now();
      
      const mockUser = {
        id: 1,
        login: 'testuser',
        password_hash: 'hashed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await service.validateUser(1);

      const duration = Date.now() - startTime;
      console.log(`\n✅ [validateUser] Test passed in ${duration}ms`);

      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
    });

    it('should return null if user not found', async () => {
      const startTime = Date.now();
      
      mockUsersService.findById.mockRejectedValue(new Error('Not found'));

      const result = await service.validateUser(999);

      const duration = Date.now() - startTime;
      console.log(`\n✅ [validateUser not found] Test passed in ${duration}ms`);

      expect(result).toBeNull();
    });
  });

  // Дополнительный тест для проверки структуры возвращаемого пользователя
  describe('user response structure', () => {
    it('should not expose password_hash in register response', async () => {
      const registerDto: RegisterDto = {
        login: 'testuser2',
        password: 'password123',
      };

      const mockUser = {
        id: 2,
        login: 'testuser2',
        password_hash: 'secret_hash',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockUsersService.findByLogin.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);
      mockUsersService.createProfile.mockResolvedValue({ id: 2, user_id: 2 });
      mockJwtService.sign.mockReturnValue('token');

      const result = await service.register(registerDto);

      // Проверяем, что password_hash отсутствует в ответе
      expect(result.user).not.toHaveProperty('password_hash');
      
      // Проверяем, что остальные поля присутствуют
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('login');
      expect(result.user).toHaveProperty('created_at');
      expect(result.user).toHaveProperty('updated_at');
    });

    it('should not expose password_hash in login response', async () => {
      const loginDto: LoginDto = {
        login: 'testuser3',
        password: 'password123',
      };

      const hashedPassword = await bcrypt.hash('password123', 10);

      const mockUser = {
        id: 3,
        login: 'testuser3',
        password_hash: hashedPassword,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockUsersService.findByLogin.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('token');

      const result = await service.login(loginDto);

      // Проверяем, что password_hash отсутствует в ответе
      expect(result.user).not.toHaveProperty('password_hash');
    });
  });

  it('should be defined', () => {
    console.log('\n✅ [AuthService definition] Test passed');
    expect(service).toBeDefined();
  });
});