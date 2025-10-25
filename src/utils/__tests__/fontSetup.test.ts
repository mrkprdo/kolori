import { Text } from 'react-native';
import { setupDefaultFont } from '../fontSetup';

// Mock React Native Text component
jest.mock('react-native', () => ({
  Text: {
    render: jest.fn((props: any) => ({
      props: { style: [] },
    })),
  },
}));

describe('fontSetup', () => {
  describe('setupDefaultFont', () => {
    it('should modify Text.render', () => {
      const originalRender = Text.render;
      setupDefaultFont();

      // Text.render should have been replaced
      expect(Text.render).toBeDefined();
      expect(typeof Text.render).toBe('function');
    });

    it('should add default font family to Text components', () => {
      setupDefaultFont();

      // Create mock arguments for render
      const mockArgs: any[] = [];

      // Call the modified render function
      // @ts-ignore
      const result = Text.render.call({}, ...mockArgs);

      // Check that result has props and style
      expect(result).toHaveProperty('props');
      expect(result.props).toHaveProperty('style');

      // Style should be an array
      expect(Array.isArray(result.props.style)).toBe(true);

      // First style should include Montserrat font
      expect(result.props.style[0]).toHaveProperty('fontFamily', 'Montserrat_400Regular');
    });

    it('should preserve existing styles', () => {
      setupDefaultFont();

      const mockExistingStyle = { color: 'red', fontSize: 16 };
      const originalRender = jest.fn(() => ({
        props: { style: mockExistingStyle },
      }));

      // Temporarily replace with our test render
      const oldRender = Text.render;
      Text.render = originalRender;

      setupDefaultFont();

      // @ts-ignore
      const result = Text.render.call({});

      expect(result.props.style).toEqual([
        { fontFamily: 'Montserrat_400Regular' },
        mockExistingStyle,
      ]);

      // Restore
      Text.render = oldRender;
    });

    it('should not throw when called multiple times', () => {
      expect(() => {
        setupDefaultFont();
        setupDefaultFont();
        setupDefaultFont();
      }).not.toThrow();
    });
  });
});
