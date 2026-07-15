import type { Document as XmlDocument, Element as XmlElement } from '@xmldom/xmldom';

export const elementsByName = (root: XmlDocument | XmlElement, localName: string): XmlElement[] => {
  const elements = Array.from(root.getElementsByTagName('*'));
  return elements.filter(
    (element) => element.localName === localName || element.nodeName === localName,
  );
};

export const directChildrenByName = (element: XmlElement, localName: string): XmlElement[] =>
  Array.from(element.childNodes).filter(
    (node): node is XmlElement =>
      node.nodeType === 1 &&
      ((node as XmlElement).localName === localName || (node as XmlElement).nodeName === localName),
  );

export const directChildText = (element: XmlElement, localName: string): string => {
  const child = directChildrenByName(element, localName)[0];
  return child?.textContent?.trim() ?? '';
};

export const textOfFirstDescendant = (element: XmlElement, localName: string): string => {
  const child = elementsByName(element, localName)[0];
  return child?.textContent?.trim() ?? '';
};

export const attributeValue = (element: XmlElement, name: string): string | null => {
  const value = element.getAttribute(name);
  return value === '' ? null : value;
};
