import { writeFile, mkdir, readdir, unlink } from 'fs/promises'
import { join, resolve } from 'path'
import { randomUUID } from 'crypto'
import assert from 'assert'
import { config, logger } from '../config.js'

const TEMP_DIR = config.staticDir

export class FileManager {
    static validateAllowedPath(filePath: string): boolean {
        if (config.allowedDirs.length === 0) {
            return true
        }

        const resolvedPath = resolve(filePath)
        return config.allowedDirs.some(allowedDir => {
            const resolvedAllowedDir = resolve(allowedDir)
            return resolvedPath.startsWith(resolvedAllowedDir)
        })
    }

    static async ensureTempDir() {
        try {
            await mkdir(TEMP_DIR, { recursive: true })
            assert(TEMP_DIR, 'TEMP_DIR must be defined')
        } catch (error) {
            assert(error, 'Error must be provided')
        }
    }

    static async cleanupTempDir(): Promise<number> {
        try {
            await this.ensureTempDir()

            const files = await readdir(TEMP_DIR)
            let deletedCount = 0

            for (const file of files) {
                const filePath = join(TEMP_DIR, file)
                try {
                    await unlink(filePath)
                    deletedCount++
                } catch (error) {
                    logger.warn(`Failed to delete file ${file}:`, error as Error)
                }
            }

            if (deletedCount > 0) {
                logger.info(`Cleaned up ${deletedCount} files from temp directory`)
            }

            return deletedCount
        } catch (error) {
            logger.error('Error during temp directory cleanup:', error as Error)
            return 0
        }
    }

    static async saveTempFile(data: string | Buffer, format: string): Promise<string> {
        assert(data, 'Data is required')
        assert(format, 'Format is required')
        assert(format.trim().length > 0, 'Format cannot be empty')
        assert(['svg', 'png', 'jpg', 'jpeg', 'pdf'].includes(format), `Invalid format: ${format}`)

        if (typeof data === 'string') {
            assert(data.length > 0, 'String data cannot be empty')
        } else {
            assert(data.length > 0, 'Buffer data cannot be empty')
        }

        await this.ensureTempDir()
        assert(TEMP_DIR, 'TEMP_DIR must be defined')

        const filename = `${randomUUID()}.${format}`
        assert(filename, 'Filename must be generated')
        assert(filename.includes(format), 'Filename must include format extension')

        const filePath = join(TEMP_DIR, filename)
        assert(filePath, 'File path must be generated')

        if (!this.validateAllowedPath(filePath)) {
            logger.warn({ filePath, allowedDirs: config.allowedDirs }, 'File path is not in allowed directories')
            throw new Error(`File path ${filePath} is not in allowed directories: ${config.allowedDirs.join(', ')}`)
        }
        logger.info({ filePath, filename }, 'Saving temp file')
        await writeFile(filePath, data)
        return filename
    }

    static getTempDir(): string {
        assert(TEMP_DIR, 'TEMP_DIR must be defined')
        return TEMP_DIR
    }
} 