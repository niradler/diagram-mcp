import { config as dotenvConfig } from 'dotenv'
import { join } from 'path'
import pino from 'pino'
import { existsSync, mkdirSync } from 'fs'

// Load environment variables from .env file
dotenvConfig()

export interface Config {
    staticDir: string
    allowedDirs: string[]
    serverPort: number
    transportType: 'http' | 'stdio'
}

const logDir = join(process.cwd(), 'logs')
if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true })
}

const createLoggerTransports = (transportType: 'http' | 'stdio') => {
    const transports = [
        {
            target: 'pino/file',
            options: {
                destination: join(logDir, 'diagram-mcp-server.log'),
                mkdir: true
            }
        }
    ]

    if (transportType === 'http') {
        transports.push({
            target: 'pino-pretty',
            options: {
                // @ts-ignore
                colorize: true
            }
        })
    }

    return transports
}

function parseAllowedDirs(): string[] {
    const allowedDirs = process.env.ALLOWED_DIRS
    if (!allowedDirs) return []

    return allowedDirs.split(',').map(dir => dir.trim()).filter(dir => dir.length > 0)
}

function parseServerPort(): number {
    const port = process.env.PORT
    if (!port) return 8099

    const parsedPort = parseInt(port, 10)
    if (isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
        console.warn(`Invalid SERVER_PORT: ${port}, using default: 8099`)
        return 8099
    }

    return parsedPort
}

function parseTransportType(): 'http' | 'stdio' {
    const transport = process.env.TRANSPORT_TYPE
    if (!transport) return 'stdio'

    const normalizedTransport = transport.toLowerCase()
    if (normalizedTransport === 'http') return 'http'
    if (normalizedTransport === 'stdio') return 'stdio'

    console.warn(`Invalid TRANSPORT_TYPE: ${transport}, using default: stdio`)
    return 'stdio'
}

export const config: Config = {
    staticDir: process.env.STATIC_DIR || join(process.cwd(), 'temp-images'),
    allowedDirs: parseAllowedDirs(),
    serverPort: parseServerPort(),
    transportType: parseTransportType()
}

export const logger = pino({
    level: 'info',
    transport: {
        targets: createLoggerTransports(config.transportType)
    }
})
