/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useState } from 'react';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import {
  EuiButtonEmpty,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiPopover,
} from '@elastic/eui';
import { UICapabilities } from 'ui/capabilities';
import DateMath from '@elastic/datemath';
import { MetricsExplorerSeries } from '../../../server/routes/metrics_explorer/types';
import {
  MetricsExplorerOptions,
  MetricsExplorerTimeOptions,
} from '../../containers/metrics_explorer/use_metrics_explorer_options';
import { createTSVBLink } from './helpers/create_tsvb_link';
import { InfraNodeType } from '../../graphql/types';
import { getNodeDetailUrl } from '../../pages/link_to/redirect_to_node_detail';
import { SourceConfiguration } from '../../utils/source_configuration';

interface Props {
  intl: InjectedIntl;
  options: MetricsExplorerOptions;
  onFilter?: (query: string) => void;
  series: MetricsExplorerSeries;
  source?: SourceConfiguration;
  timeRange: MetricsExplorerTimeOptions;
  uiCapabilities: UICapabilities;
}

const fieldToNodeType = (source: SourceConfiguration, field: string): InfraNodeType | undefined => {
  if (source.fields.host === field) {
    return InfraNodeType.host;
  }
  if (source.fields.pod === field) {
    return InfraNodeType.pod;
  }
  if (source.fields.container === field) {
    return InfraNodeType.container;
  }
};

const dateMathExpressionToEpoch = (dateMathExpression: string, roundUp = false): number => {
  const dateObj = DateMath.parse(dateMathExpression, { roundUp });
  if (!dateObj) throw new Error(`"${dateMathExpression}" is not a valid time string`);
  return dateObj.valueOf();
};

export const createNodeDetailLink = (
  nodeType: InfraNodeType,
  nodeId: string,
  from: string,
  to: string
) => {
  return getNodeDetailUrl({
    nodeType,
    nodeId,
    from: dateMathExpressionToEpoch(from),
    to: dateMathExpressionToEpoch(to, true),
  });
};

export const MetricsExplorerChartContextMenu = injectI18n(
  ({ intl, onFilter, options, series, source, timeRange, uiCapabilities }: Props) => {
    const [isPopoverOpen, setPopoverState] = useState(false);
    const supportFiltering = options.groupBy != null && onFilter != null;
    const handleFilter = useCallback(
      () => {
        // onFilter needs check for Typescript even though it's
        // covered by supportFiltering variable
        if (supportFiltering && onFilter) {
          onFilter(`${options.groupBy}: "${series.id}"`);
        }
        setPopoverState(false);
      },
      [supportFiltering, options.groupBy, series.id, onFilter]
    );

    const tsvbUrl = createTSVBLink(source, options, series, timeRange);

    // Only display the "Add Filter" option if it's supported
    const filterByItem = supportFiltering
      ? [
          {
            name: intl.formatMessage({
              id: 'xpack.infra.metricsExplorer.filterByLabel',
              defaultMessage: 'Add filter',
            }),
            icon: 'infraApp',
            onClick: handleFilter,
            'data-test-subj': 'metricsExplorerAction-AddFilter',
          },
        ]
      : [];

    const nodeType = source && options.groupBy && fieldToNodeType(source, options.groupBy);
    const viewNodeDetail = nodeType
      ? [
          {
            name: intl.formatMessage(
              {
                id: 'xpack.infra.metricsExplorer.viewNodeDetail',
                defaultMessage: 'View metrics for {name}',
              },
              { name: nodeType }
            ),
            icon: 'infraApp',
            href: createNodeDetailLink(nodeType, series.id, timeRange.from, timeRange.to),
            'data-test-subj': 'metricsExplorerAction-ViewNodeMetrics',
          },
        ]
      : [];

    const openInVisualize = uiCapabilities.visualize.show
      ? [
          {
            name: intl.formatMessage({
              id: 'xpack.infra.metricsExplorer.openInTSVB',
              defaultMessage: 'Open in Visualize',
            }),
            href: tsvbUrl,
            icon: 'visualizeApp',
            disabled: options.metrics.length === 0,
            'data-test-subj': 'metricsExplorerAction-OpenInTSVB',
          },
        ]
      : [];

    const itemPanels = [...filterByItem, ...openInVisualize, ...viewNodeDetail];

    // If there are no itemPanels then there is no reason to show the actions button.
    if (itemPanels.length === 0) return null;

    const panels: EuiContextMenuPanelDescriptor[] = [
      {
        id: 0,
        title: 'Actions',
        items: itemPanels,
      },
    ];

    const handleClose = () => setPopoverState(false);
    const handleOpen = () => setPopoverState(true);
    const actionAriaLabel = intl.formatMessage(
      {
        id: 'xpack.infra.metricsExplorer.actionsLabel.aria',
        defaultMessage: 'Actions for {grouping}',
      },
      { grouping: series.id }
    );
    const actionLabel = intl.formatMessage({
      id: 'xpack.infra.metricsExplorer.actionsLabel.button',
      defaultMessage: 'Actions',
    });
    const button = (
      <EuiButtonEmpty
        contentProps={{ 'aria-label': actionAriaLabel }}
        onClick={handleOpen}
        size="s"
        iconType="arrowDown"
        iconSide="right"
      >
        {actionLabel}
      </EuiButtonEmpty>
    );
    return (
      <EuiPopover
        closePopover={handleClose}
        id={`${series.id}-popover`}
        button={button}
        isOpen={isPopoverOpen}
        panelPaddingSize="none"
      >
        <EuiContextMenu initialPanelId={0} panels={panels} />
      </EuiPopover>
    );
  }
);
