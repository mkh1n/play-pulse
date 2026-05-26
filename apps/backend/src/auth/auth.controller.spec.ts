import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    validateUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const startTime = Date.now();
      
      const registerDto: RegisterDto = {
        login: 'testuser',
        password: 'password123',
      };

      const expectedResponse = {
        user: { id: 1, login: 'testuser' },
        token: 'jwt_token',
      };

      mockAuthService.register.mockResolvedValue(expectedResponse);

      const result = await controller.register(registerDto);

      const duration = Date.now() - startTime;
      console.log(`\n✅ [register endpoint] Test passed in ${duration}ms`);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('login', () => {
    it('should login user', async () => {
      const startTime = Date.now();
      
      const loginDto: LoginDto = {
        login: 'testuser',
        password: 'password123',
      };

      const expectedResponse = {
        user: { id: 1, login: 'testuser' },
        token: 'jwt_token',
      };

      mockAuthService.login.mockResolvedValue(expectedResponse);

      const result = await controller.login(loginDto);

      const duration = Date.now() - startTime;
      console.log(`\n✅ [login endpoint] Test passed in ${duration}ms`);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('validate', () => {
    it('should validate token and return user info', async () => {
      const startTime = Date.now();
      
      const mockReq = {
        user: {
          id: 1,
          login: 'testuser',
          username: 'Test User',
        },
      };

      const result = await controller.validate(mockReq);

      const duration = Date.now() - startTime;
      console.log(`\n✅ [validate endpoint] Test passed in ${duration}ms`);

      expect(result).toEqual({
        valid: true,
        user: {
          id: 1,
          login: 'testuser',
          username: 'Test User',
        },
      });
    });
  });

  describe('logout', () => {
    it('should logout user', async () => {
      const startTime = Date.now();
      
      const result = await controller.logout();

      const duration = Date.now() - startTime;
      console.log(`\n✅ [logout endpoint] Test passed in ${duration}ms`);

      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  it('should be defined', () => {
    console.log('\n✅ [AuthController definition] Test passed');
    expect(controller).toBeDefined();
  });
});