import {
  DOMParser,
  type Document as XmlDocument,
  type Element as XmlElement,
} from '@xmldom/xmldom';
import { describe, expect, it } from 'vitest';
import {
  attributeValue,
  directChildrenByName,
  directChildText,
  elementsByName,
  textOfFirstDescendant,
} from './dom.js';

const parse = (source: string): XmlDocument =>
  new DOMParser().parseFromString(source, 'application/xml');

const rootElement = (document: XmlDocument): XmlElement => {
  const root = document.documentElement;

  if (!root) {
    throw new Error('Expected a document element.');
  }

  return root;
};

describe('DOM helpers', () => {
  it('finds elements by localName and prefixed nodeName', () => {
    const document = parse(
      '<kml xmlns:gx="http://www.google.com/kml/ext/2.2"><Document><Placemark/><gx:Track/></Document></kml>',
    );

    expect(elementsByName(document, 'Placemark')).toHaveLength(1);
    expect(elementsByName(document, 'Track')).toHaveLength(1);
    expect(elementsByName(document, 'gx:Track')).toHaveLength(1);
  });

  it('reads only direct child text', () => {
    const document = parse(
      '<Placemark><name>Direct</name><Folder><name>Nested</name></Folder></Placemark>',
    );
    const placemark = rootElement(document);

    expect(directChildrenByName(placemark, 'name')).toHaveLength(1);
    expect(directChildText(placemark, 'name')).toBe('Direct');
    expect(directChildText(placemark, 'missing')).toBe('');
  });

  it('reads first descendant text', () => {
    const document = parse(
      '<Placemark><Point><altitudeMode>absolute</altitudeMode></Point></Placemark>',
    );

    expect(textOfFirstDescendant(rootElement(document), 'altitudeMode')).toBe('absolute');
    expect(textOfFirstDescendant(rootElement(document), 'missing')).toBe('');
  });

  it('normalizes empty attributes to null', () => {
    const document = parse('<Style id="" other="value" />');

    expect(attributeValue(rootElement(document), 'id')).toBeNull();
    expect(attributeValue(rootElement(document), 'other')).toBe('value');
    expect(attributeValue(rootElement(document), 'missing')).toBeNull();
  });
});
