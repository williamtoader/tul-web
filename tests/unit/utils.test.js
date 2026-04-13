import { utils as Utils } from '../../tulweb.js';

describe('Utils', () => {
    describe('createElement', () => {
        test('creates an element with class', () => {
            const el = Utils.createElement('div', 'my-class');
            expect(el.tagName).toBe('DIV');
            expect(el.className).toBe('my-class');
        });

        test('appends to parent if provided', () => {
            const parent = document.createElement('div');
            const child = Utils.createElement('span', 'child', parent);
            expect(parent.firstChild).toBe(child);
        });
    });

    describe('generateId', () => {
        test('returns a string', () => {
            expect(typeof Utils.generateId()).toBe('string');
        });

        test('returns unique IDs', () => {
            const id1 = Utils.generateId();
            const id2 = Utils.generateId();
            expect(id1).not.toBe(id2);
        });
    });

    describe('parseSize', () => {
        test('parses numbers as weight', () => {
            expect(Utils.parseSize(25)).toEqual({ value: 25, unit: 'weight' });
        });

        test('parses weight strings', () => {
            expect(Utils.parseSize('50%')).toEqual({ value: 50, unit: '%' });
        });

        test('parses pixel strings', () => {
            expect(Utils.parseSize('300px')).toEqual({ value: 300, unit: 'px' });
        });

        test('defaults to pixels for plain numeric strings', () => {
            expect(Utils.parseSize('50')).toEqual({ value: 50, unit: 'px' });
        });
    });

    describe('resolveToPixels', () => {
        test('resolves numbers directly', () => {
            expect(Utils.resolveToPixels(100, 500)).toBe(100);
        });

        test('resolves percentage strings', () => {
            expect(Utils.resolveToPixels('50%', 1000)).toBe(500);
        });
    });

    describe('getRelativePos', () => {
        test('calculates correct relative position', () => {
            const el = document.createElement('div');
            // Mock getBoundingClientRect
            el.getBoundingClientRect = () => ({
                left: 100,
                top: 100,
                width: 200,
                height: 200,
                right: 300,
                bottom: 300
            });

            const evt = { clientX: 150, clientY: 150 };
            const pos = Utils.getRelativePos(evt, el);

            expect(pos.x).toBe(50);
            expect(pos.y).toBe(50);
            expect(pos.w).toBe(200);
            expect(pos.h).toBe(200);
        });
    });
});
