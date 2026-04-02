import { IsString, IsNotEmpty, IsDateString, IsOptional, IsInt, Min, Max, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReminderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsDateString()
  scheduledFor: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  noteId?: string;

  @ApiPropertyOptional({ enum: ['RECALL', 'STUDY', 'BREAK', 'EXAM'] })
  @IsOptional()
  @IsEnum(['RECALL', 'STUDY', 'BREAK', 'EXAM'])
  type?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  difficultyLevel?: number;
}
