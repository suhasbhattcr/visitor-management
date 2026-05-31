import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { UsersService } from './users.service';

class LoginDto {
  @IsString()
  id: string;

  @IsString()
  @MinLength(1)
  pin: string;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** POST /users/login/resident — authenticate a resident; rejects security accounts */
  @Post('login/resident')
  @HttpCode(200)
  loginResident(@Body() dto: LoginDto) {
    return this.usersService.login(dto.id, dto.pin, 'resident');
  }

  /** POST /users/login/security — authenticate a security officer; rejects resident accounts */
  @Post('login/security')
  @HttpCode(200)
  loginSecurity(@Body() dto: LoginDto) {
    return this.usersService.login(dto.id, dto.pin, 'security');
  }

  /** GET /users/residents — all residents with name + unit */
  @Get('residents')
  async getResidents() {
    const residents = await this.usersService.findResidents();
    return { residents };
  }

  /** GET /users/residents/units — distinct unit codes that have residents */
  @Get('residents/units')
  async getResidentUnits() {
    const units = await this.usersService.findResidentUnits();
    return { units };
  }

  /** GET /users/security — all known security officers */
  @Get('security')
  async getSecurityOfficers() {
    const officers = await this.usersService.findSecurityOfficers();
    return { officers };
  }
}
