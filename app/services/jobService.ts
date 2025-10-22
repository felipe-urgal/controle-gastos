// app/services/jobService.ts - VERSÃO CORRIGIDA
'use server';

import { prisma } from '@/app/lib/prisma';

export interface ImportJobData {
  jobId: string;
  userId: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: number;
  result?: any;
  error?: string;
  fileName?: string;
  fileSize?: number;
  bankFormat?: string;
  totalRows?: number;
  importedRows?: number;
}

// CORREÇÃO: Exportar funções individuais em vez de um objeto
export async function createJob(jobData: Omit<ImportJobData, 'id'>): Promise<string> {
  const job = await prisma.importJob.create({
    data: {
      jobId: jobData.jobId,
      userId: jobData.userId,
      status: jobData.status,
      progress: jobData.progress,
      fileName: jobData.fileName,
      fileSize: jobData.fileSize,
      bankFormat: jobData.bankFormat,
      totalRows: jobData.totalRows,
      importedRows: jobData.importedRows
    }
  });
  
  return job.id;
}

export async function updateJob(jobId: string, updates: Partial<ImportJobData>): Promise<void> {
  const prismaData: any = {
    ...updates,
    updatedAt: new Date()
  };

  await prisma.importJob.update({
    where: { jobId },
    data: prismaData
  });
}

export async function getJob(jobId: string): Promise<ImportJobData | null> {
  const job = await prisma.importJob.findUnique({
    where: { jobId }
  });

  if (!job) return null;

  return {
    jobId: job.jobId,
    userId: job.userId,
    status: job.status as 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED',
    progress: job.progress,
    result: job.result,
    error: job.error || undefined,
    fileName: job.fileName || undefined,
    fileSize: job.fileSize || undefined,
    bankFormat: job.bankFormat || undefined,
    totalRows: job.totalRows || undefined,
    importedRows: job.importedRows || undefined
  };
}

export async function getUserJobs(userId: string, limit: number = 10): Promise<ImportJobData[]> {
  const jobs = await prisma.importJob.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  return jobs.map(job => ({
    jobId: job.jobId,
    userId: job.userId,
    status: job.status as 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED',
    progress: job.progress,
    result: job.result,
    error: job.error || undefined,
    fileName: job.fileName || undefined,
    fileSize: job.fileSize || undefined,
    bankFormat: job.bankFormat || undefined,
    totalRows: job.totalRows || undefined,
    importedRows: job.importedRows || undefined
  }));
}

export async function cleanupOldJobs(days: number = 7): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  await prisma.importJob.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate
      }
    }
  });
}

export async function cancelJob(jobId: string): Promise<void> {
  await prisma.importJob.update({
    where: { jobId },
    data: {
      status: 'CANCELLED',
      progress: 0,
      error: 'Importação cancelada pelo usuário',
      updatedAt: new Date()
    }
  });
}
