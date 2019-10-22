import React from 'react'
import styled from 'styled-components'
import gql from 'graphql-tag'
import { Query } from 'react-apollo'
import _ from 'lodash'
import { DCREGION } from 'constants/dcregion'
import StackedNormalizedHorizontalBarChart from 'components/atoms/charts/StackedNormalizedHorizontalBarChart'
import PredictionChartPanel from 'components/organisms/PredictionChartPanel'
import { QUERY_GET_CONSTITUENCY_CAMP_DATA } from 'queries/gql'
import LoadingButton from 'components/molecules/LoadingButton'
import Text from 'components/atoms/Text'
import Box from '@material-ui/core/Box'
import { COLORS } from 'ui/theme'
import { DefaultLink } from 'components/atoms/Link'

const Container = styled.div`
  && {
    width: 100%;
    display: flex;
    flex-direction: column;
  }
`

const PredictionChartHeader = styled(Box)`
  && {
    display: block;
    justify-content: space-between;
    align-items: center;
  }
`

const StyledLoadingButton = styled(LoadingButton)`
  && {
    width: 100%;
    background-color: ${COLORS.main.primary};
    color: ${COLORS.main.background};
    padding: 5px 16px;
    :hover {
      color: ${COLORS.main.primary};
      border-color: 1px ${COLORS.main.primary} solid;
    }
  }
`

const FETCH_CAMP_DATA = gql`
  query fetch_camp_data($year: Int!) {
    dcd_candidates(where: { is_won: { _eq: true }, year: { _eq: $year } }) {
      cacode
      camp
      person {
        name_zh
      }
    }
  }
`

function groupDataByRegionAndCamp(candidates) {
  const byCodes = _.groupBy(candidates, candidate => candidate.cacode[0])
  return Object.keys(byCodes).map(code => ({
    code,
    count: byCodes[code]
      .map(r => ({ [r.camp]: 1 }))
      .reduce((p, c) => {
        const val = Object.assign(p)
        Object.keys(c).forEach(k => (val[k] = c[k] + (val[k] ? val[k] : 0)))
        return val
      }, {}),
  }))
}

function convertToD3Compatible(data, sortFunc) {
  const res = {
    data: data
      .map(d => {
        return {
          name: DCREGION[d.code].zh_hk,
          建制: DCREGION[d.code].unelected_dc_seat + (d.count['建制'] || 0), // 當然議員
          非建制: d.count['民主'] || 0,
          其他: d.count['其他'] || 0,
          total: Object.values(d.count).reduce((acc, c) => {
            acc += c
            return acc
          }, 0),
        }
      })
      .sort(
        sortFunc
          ? sortFunc
          : (a, b) => b['建制'] / b.total - a['建制'] / a.total
      ), // default sort by established count
    columns: ['name', '建制', '其他', '非建制'],
  }
  return res
}

const sortByDefaultChartOrderFunc = defaultChartData => (a, b) => {
  const indexFromOriginalChartData = record => {
    let index = defaultChartData.length
    defaultChartData.data.forEach((v, i) => {
      if (v.name === record.name) {
        index = i
        return i
      }
    })
    return index
  }
  return indexFromOriginalChartData(a) - indexFromOriginalChartData(b)
}

// const AGE_GROUP_YOUNG = ['18-20', '21-25', '26-30']
const AGE_GROUP_MIDDLE = ['31-35', '36-40', '41-45', '46-50', '51-55', '56-60']
const AGE_GROUP_OLD = ['61-65', '66-70', '71+']

const STAT_TYPE_NEW_VOTERS = 'NEW_VOTERS'
const STAT_TYPE_ALL_VOTERS = 'VOTERS'

const groupExpectDataByRegionAndCamp = (constituencies, settings) => {
  const getVoteCountBySetting = (stat, camp, settings) => {
    let settingIndex = 0
    if (AGE_GROUP_MIDDLE.indexOf(stat.category_2) >= 0) {
      settingIndex = 1
    } else if (AGE_GROUP_OLD.indexOf(stat.category_2) >= 0) {
      settingIndex = 2
    }

    const votePercentage = settings.vote_rate[settingIndex] / 100.0
    let yellowPercentage = settings.camp_rate[settingIndex] / 100.0
    if (camp === '建制') {
      yellowPercentage = 1 - yellowPercentage
    } else if (camp === '其他') {
      yellowPercentage = 0 // TODO: how to calculate this?
    }

    return stat.count * yellowPercentage * votePercentage
  }
  const getProjectedVotes = (type, camp, settings, voteStats) => {
    return voteStats
      .filter(s => s.subtype === type)
      .map(s => getVoteCountBySetting(s, camp, settings))
      .reduce((c, v) => c + v, 0)
  }
  // First calculate the winner
  const expectedResult = constituencies.map(constituency => {
    let camp = '建制' // default camp = 建制 is this good?

    if (
      constituency.predecessors &&
      constituency.predecessors.length > 0 &&
      settings.config.reference_last_election
    ) {
      // if there is predecessor, we use only the new voters

      if (
        constituency.predecessors[0].predecessor.candidates.length === 1 &&
        settings.config.auto_won_add_components
      ) {
        const camps = ['民主', '建制', '其他']
        const onlyCandidate =
          constituency.predecessors[0].predecessor.candidates[0]
        camps.forEach(camp => {
          // mock the votes for the last election
          const votes =
            getProjectedVotes(
              STAT_TYPE_ALL_VOTERS,
              camp,
              settings,
              constituency.vote_stats
            ) -
            getProjectedVotes(
              STAT_TYPE_NEW_VOTERS,
              camp,
              settings,
              constituency.vote_stats
            )

          if (onlyCandidate.camp !== camp) {
            constituency.predecessors[0].predecessor.candidates.push({
              camp,
              votes,
              mock: true,
            })
          } else {
            onlyCandidate.votes = votes
          }
        })
      }
      let maxVote = 0
      constituency.predecessors[0].predecessor.candidates.forEach(c => {
        const projectedVotes =
          c.votes +
          getProjectedVotes(
            STAT_TYPE_NEW_VOTERS,
            c.camp,
            settings,
            constituency.vote_stats
          )
        if (
          projectedVotes >= maxVote &&
          (!c.mock || settings.config.auto_won_add_components)
        ) {
          camp = c.camp
          maxVote = projectedVotes
        }
      })
    } else {
      // else we calculate from all voters
      const establishCount = getProjectedVotes(
        STAT_TYPE_ALL_VOTERS,
        '建制',
        settings,
        constituency.vote_stats
      )
      const democracyCount = getProjectedVotes(
        STAT_TYPE_ALL_VOTERS,
        '民主',
        settings,
        constituency.vote_stats
      )
      if (democracyCount > establishCount) {
        camp = '民主'
      }
    }

    return {
      cacode: constituency.code,
      camp,
    }
  })
  const byCodes = _.groupBy(expectedResult, c => c.cacode[0])
  return Object.keys(byCodes).map(code => ({
    code,
    count: byCodes[code]
      .map(r => ({ [r.camp]: 1 }))
      .reduce((p, c) => {
        const val = Object.assign(p)
        Object.keys(c).forEach(k => (val[k] = c[k] + (val[k] ? val[k] : 0)))
        return val
      }, {}),
  }))
}

const CampCompareChartContainer = props => {
  const { className } = props
  const [predictEnabled, setPredictEnabled] = React.useState(false)
  const [settings, setSettings] = React.useState({
    config: {
      auto_won_add_components: true,
      reference_last_election: true,
    },
    camp_rate: [60, 50, 40],
    vote_rate: [40, 40, 40],
  })
  return (
    <Query query={FETCH_CAMP_DATA} variables={{ year: 2015 }}>
      {({ loading, error, data }) => {
        if (loading) return null
        if (error) return `Error! ${error}`

        const dataFroGraph = groupDataByRegionAndCamp(data.dcd_candidates)
        const dataForD3 = convertToD3Compatible(dataFroGraph)

        return (
          <Query
            query={QUERY_GET_CONSTITUENCY_CAMP_DATA}
            variables={{ year: 2019 }}
          >
            {({ loading, error, data }) => {
              let d3Data = dataForD3

              if (!loading && predictEnabled) {
                const expectedDataForGraph = groupExpectDataByRegionAndCamp(
                  data.dcd_constituencies,
                  settings
                )
                d3Data = convertToD3Compatible(
                  expectedDataForGraph,
                  sortByDefaultChartOrderFunc(dataForD3)
                )
              }

              return (
                <Container className={className}>
                  <PredictionChartHeader>
                    <Text variant="h5">
                      {predictEnabled
                        ? '2019選舉結果預測'
                        : '現屆區議會勢力分布'}
                    </Text>
                    <br />
                    <Text variant="body2">
                      {predictEnabled && (
                        <>
                          <p>
                            本模擬綜合2019年選民登記數字，18及19年間新增選民數字，以及2015區議會選舉實際投票結果。
                          </p>
                          <p>
                            首先將15年區選各選區投票結果歸納為分為「建制」、「民主」及「其他」三陣營，並假設選民維持投票取向，並按其比例將各陣營得票分配至2018的選民登記數字。
                          </p>
                          <p>
                            滑桿只調較2018及19年間新增選民的投票取向及投票率，如欲直接調較19年選民的取態，請到「設定
                            」取消「只計算新增選民，同時假設上屆投票選民維持相冋政治取向」一項。
                          </p>
                          <p>
                            是次選舉將選出452個民選議席，連同新界區27名當然議員共479席。當然議員即各區鄉事委員會主席，故這些議席全歸類為建制派。
                          </p>
                          <p>
                            選舉結果由眾多因素影響，故模擬結果僅供參考，亦因數據來源限制而簡化，如有建議歡迎
                            <DefaultLink
                              target="_blank"
                              href="https://forms.gle/irD6tEznWPNda6w59"
                            >
                              回報
                            </DefaultLink>
                            。
                          </p>
                        </>
                      )}
                    </Text>
                    {!predictEnabled && (
                      <StyledLoadingButton
                        isLoading={loading}
                        onClick={() => setPredictEnabled(true)}
                        label="預測結果"
                      />
                    )}
                  </PredictionChartHeader>
                  <br />
                  {!loading && predictEnabled && (
                    <PredictionChartPanel
                      settings={settings}
                      setSettings={setSettings}
                    />
                  )}
                  <StackedNormalizedHorizontalBarChart
                    data={d3Data}
                  ></StackedNormalizedHorizontalBarChart>
                </Container>
              )
            }}
          </Query>
        )
      }}
    </Query>
  )
}
export default CampCompareChartContainer
