import { writeFile } from 'fs/promises'
import { join } from 'path'
import { z } from 'zod'
import assert from 'assert'
import { DiagramResult, OutputType } from '../types.js'
import { FileManager } from './file-manager.js'
import { config, logger } from '../config.js'

export interface RenderParams {
    data: string
    format: string
    output?: OutputType
    width?: number
    height?: number
    size?: {
        width: number
        height: number
    }
}

export async function handleRenderOutput(params: RenderParams): Promise<DiagramResult> {
    const { data, format, output = 'link', width, height, size } = params

    assert(data, 'Data is required')
    assert(format, 'Format is required')
    assert(['link', 'filepath', 'raw'].includes(output), `Invalid output type: ${output}`)

    if (output === 'filepath') {
        assert(format, 'Format is required for filepath output')

        const filename = await FileManager.saveTempFile(data, format)
        assert(filename, 'FileManager.saveTempFile must return a filename')

        const filePath = join(FileManager.getTempDir(), filename)
        assert(filePath, 'File path must be generated')

        if (format === 'svg' || format === 'pdf') {
            await writeFile(filePath, data)
        } else {
            const fileData = Buffer.from(data, 'base64')
            assert(fileData.length > 0, 'Base64 data must not be empty')
            await writeFile(filePath, fileData)
        }

        logger.info({ format, output_type: 'filepath', filePath }, 'Chart rendered successfully - filepath output')
        return {
            success: true,
            data: filePath,
            format,
            size,
            output_type: 'filepath'
        }
    } else if (output === 'link' && (format === 'png' || format === 'jpg' || format === 'pdf' || format === 'svg')) {
        let fileData: string | Buffer = data
        assert(fileData, 'File data is required for link output')

        if (format === 'png' || format === 'jpg' || format === 'pdf') {
            fileData = Buffer.from(data, 'base64')
            assert(fileData.length > 0, 'Base64 data must not be empty')
        } else if (format === 'svg') {
            assert(fileData.startsWith('<svg'), 'SVG data must start with <svg')
        }

        const filename = await FileManager.saveTempFile(fileData, format)
        assert(filename, 'FileManager.saveTempFile must return a filename')

        const localhostUrl = `http://localhost:${config.serverPort}/static/${filename}`
        assert(localhostUrl, 'Localhost URL must be generated')
        assert(localhostUrl.startsWith('http://localhost:'), 'URL must be localhost')

        logger.info({ format, output_type: 'link', localhostUrl }, 'Chart rendered successfully - link output')
        return {
            success: true,
            data: localhostUrl,
            format,
            size,
            output_type: 'link'
        }
    } else {
        assert(data, 'Raw output requires data')
        logger.info({ format, output_type: 'raw' }, 'Chart rendered successfully - raw output')
        return {
            success: true,
            data,
            format,
            size,
            output_type: 'raw'
        }
    }
} 