import styled from "styled-components";

export const SideMenu = styled.aside(
  (props) => `
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: fixed;
  left: 0;
  top: 0;
  background: var(--background-primary);
  width: 310px;
  height: 100vh;
  z-index: 999;
  box-shadow: 1px -6px 32px -12px rgba(9, 130, 0, 1);
  padding: 0 24px 24px;
  transition: transform 0.5s ease;
  transform: ${props.visible ? "translateX(-310px)" : "translateX(0)"};
  @media (max-width: 1280px) {
    opacity: 0;
    pointer-events: none;
  }
`
);

export const Logo = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 0;
  margin-bottom: 20px;
  img {
    width: 280px;
  }
`;

export const NavMenu = styled.ul`
  padding: 0;
  padding-bottom: 120px;
`;

export const MenuItem = styled.li`
  font-family: "aileron", sans-serif;
  list-style: none;
  padding-bottom: 10px;
  a {
    display: flex;
    align-items: center;
    width: 100%;
    height: 100%;
    text-decoration: none;
    padding: 10px 20px;
    border-radius: 7px;
    transition: background-color 0.3s ease;
    &.active {
      background-color: var(--action-active);
    }
    &:hover {
      background-color: var(--action-active);
    }
    svg {
      margin-right: 16px;
    }
  }
`;

export const SocialLinksMenu = styled.div`
  width: max-content;
  margin: 0 auto;
  display: grid;
  grid-gap: 1rem;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  img {
    filter: invert(1);
    transition: opacity 0.3s ease;
  }
  a:hover {
    img {
      opacity: 0.6;
    }
  }
`;

export const PullTab = styled.button(
  (props) => `
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  margin-left: -10px;
  width: 30px;
  height: 60px;
  border-radius: 7px;
  border: 0;
  background-color: var(--background-primary);
  > img {
    width: 10px;
    transition: transform 0.5s ease;
    transform: ${props.visible ? "rotate(180deg) translateX(-5px)" : "rotate(0deg) translateX(3px)"};
  }
`
);
