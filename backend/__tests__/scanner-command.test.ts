import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { ScannerCommand } from '../commands/scanner-command.js'
import * as child_process from 'child_process'
import { EventEmitter } from 'events'

describe('ScannerCommand', () => {
  let command: ScannerCommand

  beforeEach(() => {
    command = new ScannerCommand()
  })

  describe('getParameters', () => {
    it('should include a duplex flag on unix platforms', () => {
      const params = command.getParameters()
      const duplexParam = params.find((p: any) => p.name === 'duplex')
      if (process.platform === 'win32') {
        expect(duplexParam).toBeUndefined()
      } else {
        expect(duplexParam).toBeDefined()
        expect(duplexParam!.type).toBe('boolean')
        expect(duplexParam!.description).toContain('Duplex')
      }
    })
  })

  describe('scanUnixSANE argument construction', () => {
    let spawnSpy: any
    let logSpy: any

    beforeEach(() => {
      // fake spawn that immediately emits close code 0
      spawnSpy = jest.spyOn(child_process, 'spawn').mockImplementation(
        (_cmd: string, _args: readonly string[]) => {
          const fake = new EventEmitter() as any
          fake.stdout = { on: jest.fn() }
          fake.stderr = { on: jest.fn() }
          process.nextTick(() => {
            fake.emit('close', 0)
          })
          return fake
        },
      )
      logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('adds --duplex when duplex flag is true and supported', async () => {
      // stub detection to return flag support
      jest.spyOn(command as any, 'detectDuplexSupport').mockResolvedValue({
        flagSupported: true,
        sourceOption: null
      });
      await (command as any).scanUnixSANE(
        '/tmp/out.jpg',
        '',
        '300',
        'jpg',
        false,
        true,
      )
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('--duplex'),
      )
    })

    it('skips --duplex when not supported', async () => {
      jest.spyOn(command as any, 'detectDuplexSupport').mockResolvedValue({
        flagSupported: false,
        sourceOption: null
      });
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      await (command as any).scanUnixSANE(
        '/tmp/out.jpg',
        '',
        '300',
        'jpg',
        false,
        true,
      )
      expect(logSpy).toHaveBeenCalledWith(
        expect.not.stringContaining('--duplex'),
      )
      expect(logSpy).toHaveBeenCalledWith(
        expect.not.stringContaining('--source'),
      )
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Duplex flag requested'),
      );
    })

    it('falls back to --source when duplex unsupported but source found', async () => {
      jest.spyOn(command as any, 'detectDuplexSupport').mockResolvedValue({
        flagSupported: false,
        sourceOption: 'ADF Duplex'
      });
      const execSpy = jest.spyOn(command as any as any, 'normalizeImage');
      await (command as any).scanUnixSANE(
        '/tmp/out.jpg',
        '',
        '300',
        'jpg',
        false,
        true,
      )
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringMatching(/--source\s+ADF Duplex/),
      )
      expect(execSpy).toHaveBeenCalled();
    })

    it('does not add --duplex when flag is false', async () => {
      jest.spyOn(command as any, 'detectDuplexSupport').mockResolvedValue({
        flagSupported: true,
        sourceOption: null
      });
      await (command as any).scanUnixSANE(
        '/tmp/out.jpg',
        '',
        '300',
        'jpg',
        false,
        false,
      )
      expect(logSpy).toHaveBeenCalledWith(
        expect.not.stringContaining('--duplex'),
      )
    })
  })
})
