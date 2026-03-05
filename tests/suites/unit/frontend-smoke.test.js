/**
 * @jest-environment jsdom
 */
const React = require('react');
const { createRoot } = require('react-dom/client');
const { act } = require('react');

// Mock components and hooks to isolate the smoke test
jest.mock('@/client/hooks/useApi', () => ({
  useApi: () => ({
    loading: false,
    error: null,
    analyzeText: jest.fn(),
    analyzeImage: jest.fn(),
    clearError: jest.fn()
  })
}));

jest.mock('@/client/hooks/useChemicalData', () => ({
  useChemicalData: () => ({
    chemicals: [],
    loading: false,
    error: null
  })
}));

// Mock child components that need browser APIs unavailable in jsdom
jest.mock('@/client/components/MoleculeViewer', () => () => <div data-testid="molecule-viewer" />);
jest.mock('@/client/components/TerminalSection', () => () => <div data-testid="terminal-section" />);

describe('Frontend Component Smoke Tests', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });

  const smokeTest = (Component, props = {}) => {
    const root = createRoot(container);
    act(() => {
      root.render(React.createElement(Component, props));
    });
    expect(container.innerHTML).not.toBe('');
    act(() => {
      root.unmount();
    });
  };

  test('CameraSection should render without crashing', () => {
    const CameraSection = require('@/client/components/CameraSection').default;
    smokeTest(CameraSection, { onCapture: jest.fn() });
  });

  test('PhotoSection should render without crashing', () => {
    const PhotoSection = require('@/client/components/PhotoSection').default;
    smokeTest(PhotoSection, { onUpload: jest.fn() });
  });

  test('TextInput should render without crashing', () => {
    const TextInput = require('@/client/components/TextInput').default;
    smokeTest(TextInput, { value: '', onChange: jest.fn(), onSubmit: jest.fn() });
  });

  test('App should render without crashing', () => {
    const App = require('@/client/components/App').default;
    smokeTest(App);
  });
});
