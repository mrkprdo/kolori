import { Text } from 'react-native';

// Setup default font for all Text components
export const setupDefaultFont = () => {
  const oldRender = Text.render;

  // @ts-ignore
  Text.render = function (...args) {
    const origin = oldRender.call(this, ...args);
    return {
      ...origin,
      props: {
        ...origin.props,
        style: [{ fontFamily: 'Montserrat_400Regular' }, origin.props.style],
      },
    };
  };
};
