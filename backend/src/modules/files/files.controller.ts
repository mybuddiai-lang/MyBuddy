import { Controller, Post, Get, Delete, Param, Query, Body, UploadedFile, UseInterceptors, UseGuards, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private filesService: FilesService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }))
  upload(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title?: string,
  ) {
    if (!file) throw new BadRequestException('No file received — ensure the request is multipart/form-data with a "file" field');
    return this.filesService.upload(userId, file, title);
  }

  @Post('transcribe')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } }))
  async transcribe(
    @CurrentUser('id') _userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No audio file received');
    const text = await this.filesService.transcribeAudio(file);
    return { text };
  }

  // Called after the browser has uploaded a file directly to R2 via a pre-signed URL.
  // Creates the note record and triggers async AI processing via CDN download.
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  registerUpload(
    @CurrentUser('id') userId: string,
    @Body() body: { publicUrl: string; originalFilename: string; contentType: string; title?: string },
  ) {
    if (!body.publicUrl || !body.originalFilename || !body.contentType) {
      throw new BadRequestException('publicUrl, originalFilename and contentType are required');
    }
    return this.filesService.registerUpload(userId, body);
  }

  // Returns a short-lived pre-signed PUT URL for direct browser → R2 uploads.
  // The browser uses it to PUT the file binary directly to Cloudflare R2,
  // completely bypassing the Vercel proxy (and its 4.5 MB body-size limit).
  @Get('upload-url')
  getUploadUrl(
    @CurrentUser('id') userId: string,
    @Query('contentType') contentType: string,
    @Query('filename') filename: string,
  ) {
    if (!contentType || !filename) {
      throw new BadRequestException('contentType and filename query params are required');
    }
    return this.filesService.getUploadUrl(userId, contentType, filename);
  }

  @Get()
  findAll(@CurrentUser('id') userId: string) {
    return this.filesService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.filesService.findOne(id, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.filesService.remove(id, userId);
  }
}
