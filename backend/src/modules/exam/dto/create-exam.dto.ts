import { IsArray, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export enum ExamType { MCQ = 'MCQ', SHORT_ANSWER = 'SHORT_ANSWER', MIXED = 'MIXED' }
export enum ExamDifficulty { EASY = 'EASY', MEDIUM = 'MEDIUM', HARD = 'HARD' }

export class CreateExamDto {
  @IsArray()
  @IsUUID('4', { each: true })
  noteIds: string[];

  @IsEnum(ExamType)
  examType: ExamType;

  @IsEnum(ExamDifficulty)
  difficulty: ExamDifficulty;

  @IsInt() @Min(5) @Max(20)
  questionCount: number;

  @IsOptional() @IsInt() @Min(5) @Max(180)
  timeLimitMins?: number;

  @IsOptional() @IsString()
  title?: string;
}

export class SubmitAnswerDto {
  @IsUUID()
  questionId: string;

  @IsString()
  answer: string;
}
