import { IsArray, IsDateString, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateTimetableDto {
  @IsArray()
  @IsUUID('4', { each: true })
  noteIds: string[];

  @IsOptional() @IsDateString()
  examDate?: string;

  @IsNumber() @Min(0.5) @Max(16)
  hoursPerDay: number;

  @IsOptional() @IsString()
  title?: string;

  @IsOptional() @IsString()
  reminderTime?: string; // "HH:mm" in local time — defaults to "08:00"
}
